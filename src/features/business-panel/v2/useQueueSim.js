import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES } from '../../../data/categories';
import { estimateAt } from '../../../lib/estimate';
import { hash01 } from '../../../lib/geo';
import { ticketState } from '../../../lib/tickets';

const MAX_COUNTERS = 8;
const expo = (mean) => -Math.log(1 - Math.random()) * mean;

/**
 * Live queue for a claimed venue, driven by Skiply's demand model.
 * Arrivals follow the venue's hourly demand curve; each open counter serves people with
 * exponentially distributed service times around the category average.
 * Tokens booked in the Skiply app on this device for this venue join the line as real entries.
 */
export default function useQueueSim(venue, appTickets) {
  const cat = CATEGORIES[venue.category];
  const est0 = useMemo(() => estimateAt(venue, new Date()), [venue]);
  const startCounters = Math.min(MAX_COUNTERS, Math.max(1, est0.counters));
  const seq = useRef(10 + Math.floor(hash01(venue.id) * 60));
  const nextToken = () => `${cat.letter}-${String(++seq.current % 1000).padStart(3, '0')}`;
  const dept = () => cat.departments[Math.floor(Math.random() ** 1.6 * cat.departments.length)];

  const make = (simNow, source = 'walk-in', extra = {}) => ({ token: nextToken(), dept: dept(), joined: simNow, source, ...extra });

  const [state, setState] = useState(() => {
    const now = Date.now();
    const queue = Array.from({ length: est0.people }, (_, i) => make(now - (est0.people - i) * 45000));
    const counters = Array.from({ length: MAX_COUNTERS }, (_, i) => ({ id: i + 1, on: i < startCounters, serving: null, start: 0, dur: 0 }));
    // people already served today, from the model's curve up to now
    const h = new Date().getHours();
    const servedToday = Math.round(cat.curve.slice(0, h).reduce((a, b) => a + b, 0) * (startCounters * 60 / cat.service) * 0.85);
    return { simNow: now, queue, counters, served: servedToday, waits: [], log: [], calls: 0 };
  });
  const [speed, setSpeed] = useState(10);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  const seenApp = useRef(new Set());
  const listeners = useRef([]);
  const onCall = useCallback((fn) => { listeners.current.push(fn); return () => { listeners.current = listeners.current.filter((f) => f !== fn); }; }, []);

  const log = (s, text, kind = 'info') => ({ ...s, log: [{ t: s.simNow, text, kind, id: Math.random() }, ...s.log].slice(0, 40) });

  const assign = (s, counterId, manual) => {
    const idx = s.counters.findIndex((c) => (counterId ? c.id === counterId : c.on && !c.serving));
    if (idx < 0 || !s.queue.length || !s.counters[idx].on) return s;
    const [next, ...rest] = s.queue;
    const counters = s.counters.map((c, i) => (i === idx ? { ...c, serving: next, start: s.simNow, dur: expo(cat.service) * 60000 } : c));
    const out = { ...s, queue: rest, counters, calls: s.calls + 1, lastCall: { p: next, counter: counters[idx].id, manual: !!manual, n: s.calls + 1 }, waits: [...s.waits, s.simNow - next.joined].slice(-60) };
    return log(out, `${next.token} called to Counter ${counters[idx].id}${next.source === 'app' ? ' · Skiply app' : ''}`, 'call');
  };

  // app tokens join the line
  useEffect(() => {
    const fresh = appTickets.filter((t) => t.placeId === venue.id && !seenApp.current.has(t.id) && !['done', 'cancelled'].includes(ticketState(t).phase));
    if (!fresh.length) return;
    fresh.forEach((t) => seenApp.current.add(t.id));
    setState((s) => fresh.reduce((acc, t) => log({ ...acc, queue: [...acc.queue, { token: t.token, dept: t.department, joined: acc.simNow, source: 'app', name: t.passenger?.name }] }, `${t.token} joined from the Skiply app`, 'app'), s));
  }, [appTickets, venue.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // the clock
  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => setState((s0) => {
      const dt = 1000 * speed;
      let s = { ...s0, simNow: s0.simNow + dt };
      const d = new Date(s.simNow);
      const e = estimateAt(venue, d);
      // arrivals: near-capacity at peak hours, zero when closed
      const open = s.counters.filter((c) => c.on).length;
      const lambda = e.status.open === false ? 0 : (startCounters / cat.service) * cat.curve[d.getHours()] * 0.97 * (([0, 6].includes(d.getDay())) ? cat.weekend : 1);
      let expected = lambda * (dt / 60000);
      while (expected > 0) {
        if (Math.random() < Math.min(1, expected)) { const p = make(s.simNow); s = log({ ...s, queue: [...s.queue, p] }, `${p.token} joined · ${p.dept}`, 'join'); }
        expected -= 1;
      }
      // service completions
      let served = s.served;
      const counters = s.counters.map((c) => {
        if (c.serving && s.simNow - c.start >= c.dur) { served += 1; return { ...c, serving: null }; }
        return c;
      });
      s = { ...s, counters, served };
      if (auto && open) for (let i = 0; i < counters.length; i++) s = assign(s);
      return s;
    }), 1000);
    return () => clearInterval(id);
  }, [speed, auto, paused, venue]); // eslint-disable-line react-hooks/exhaustive-deps

  const setOpenCount = useCallback((n) => setState((s) => {
    const counters = s.counters.map((c, i) => ({ ...c, on: i < n, serving: i < n ? c.serving : null }));
    const back = s.counters.filter((c, i) => i >= n && c.serving).map((c) => c.serving);
    return log({ ...s, counters, queue: [...back, ...s.queue] }, `${n} counter${n === 1 ? '' : 's'} open`, 'sys');
  }), []);
  const toggle = useCallback((id) => setState((s) => {
    const c = s.counters.find((x) => x.id === id);
    const counters = s.counters.map((x) => (x.id === id ? { ...x, on: !x.on, serving: x.on ? null : x.serving } : x));
    const queue = c.on && c.serving ? [c.serving, ...s.queue] : s.queue;
    return log({ ...s, counters, queue }, `Counter ${id} ${c.on ? 'closed' : 'opened'}`, 'sys');
  }), []);
  const callNext = useCallback((id) => setState((s) => {
    let st = s;
    const target = id ? st.counters.find((c) => c.id === id) : st.counters.find((c) => c.on && !c.serving) || st.counters.find((c) => c.on);
    if (!target) return st;
    if (target.serving) st = { ...st, served: st.served + 1, counters: st.counters.map((c) => (c.id === target.id ? { ...c, serving: null } : c)) };
    return assign(st, target.id, true);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const addWalkIn = useCallback(() => setState((s) => { const p = make(s.simNow); return log({ ...s, queue: [...s.queue, p] }, `${p.token} added at the desk`, 'join'); }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.lastCall) listeners.current.forEach((f) => f(state.lastCall));
  }, [state.lastCall?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = state.counters.filter((c) => c.on).length;
  const waitNow = open ? Math.round((state.queue.length * cat.service) / open) : null;
  const avgWait = state.waits.length ? Math.round(state.waits.reduce((a, b) => a + b, 0) / state.waits.length / 60000) : null;

  return {
    ...state, cat, open, waitNow, avgWait, max: MAX_COUNTERS,
    speed, setSpeed, auto, setAuto, paused, setPaused,
    setOpenCount, toggle, callNext, addWalkIn, onCall,
  };
}
