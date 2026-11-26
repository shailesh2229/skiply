import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import { useNearby, useNow, useReveal } from '../lib/hooks';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { fmtWait } from '../lib/estimate';
import { fmtKm } from '../lib/geo';
import { createTicket } from '../lib/tickets';
import { MODES, optimise } from '../lib/route';
import { toast, burst } from '../lib/fx';
import Emblem from '../ui/Emblem';
import SplitFlap from '../ui/SplitFlap';
import '../styles/errands.css';

const STEP = 15;
const MAX_OFFSET = 16 * 60;
const MAX_STOPS = 5;
const tm = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const dur = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim());
const flapDur = (m) => (m < 60 ? `${m}M` : `${Math.floor(m / 60)}H ${String(m % 60).padStart(2, '0')}M`);

const MODE_ICON = {
  walk: <><circle cx="13" cy="4" r="2" /><path d="m9 20 3-6 3 3v4M12 14l-1-5 4 2 3 1M11 9l-4 3" /></>,
  auto: <><circle cx="6" cy="17" r="2.5" /><circle cx="18" cy="17" r="2.5" /><path d="M3.5 17V9l4-4h7l3 5h3v7M8.5 17h7M7.5 5v5h13" /></>,
  car: <><path d="M3 16v-4l2-5h14l2 5v4z" /><circle cx="7.5" cy="16.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /><path d="M3 12h18" /></>,
};
const ModeIcon = ({ k, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{MODE_ICON[k]}</svg>
);

export default function Errands() {
  const { location, passenger, addTicket } = useApp();
  const { places, loading, error } = useNearby(location);
  const now = useNow(60000);
  const [cats, setCats] = useState(['bank', 'pharmacy', 'post_office']);
  const [locks, setLocks] = useState({});
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState('auto');
  const [taken, setTaken] = useState(false);
  useReveal();

  const base = useMemo(() => {
    const d = new Date(now); d.setSeconds(0, 0); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
    return d.getTime();
  }, [now]);
  const startMs = base + offset * 60000;

  const counts = useMemo(() => places.reduce((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {}), [places]);
  const origin = useMemo(() => ({ lat: location.lat, lng: location.lng }), [location.lat, location.lng]);

  const result = useMemo(() => {
    if (cats.length < 2 || !places.length) return null;
    return optimise({ places, cats, locks, origin, startMs, mode });
  }, [places, cats, locks, origin, startMs, mode]);

  // When nothing works at the chosen time, find the first start that does.
  const nextWorking = useMemo(() => {
    if (!result?.error) return null;
    let first = null, best = null;
    for (let o = offset + 15; o <= MAX_OFFSET; o += 15) {
      if (first != null && o > first + 120) break;
      const r = optimise({ places, cats, locks, origin, startMs: base + o * 60000, mode, budget: 15000 });
      if (!r.plan) continue;
      if (first == null) first = o;
      if (!best || r.plan.total < best.total) best = { o, total: r.plan.total };
    }
    return best ? best.o : null;
  }, [result, offset, places, cats, locks, origin, base, mode]);

  useEffect(() => { setTaken(false); }, [cats, locks, offset, mode, location.lat]);

  const toggleCat = (k) => setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.length >= MAX_STOPS ? c : [...c, k]));
  const plan = result?.plan;
  const naive = result?.naive;
  const saved = plan && naive ? Math.max(0, naive.total - plan.total) : null;

  const takeAll = (e) => {
    if (!plan) return;
    const r = e.currentTarget.getBoundingClientRect();
    plan.stops.forEach((s, i) => {
      const cat = CATEGORIES[s.place.category];
      const t = createTicket({ place: s.place, department: cat.departments[0], mode: 'advance', slot: s.arrive, estimate: s.estimate, passenger });
      addTicket({ ...t, id: `${t.id}${i}`, errand: true });
    });
    setTaken(true);
    burst(r.left + r.width / 2, r.top + r.height / 2);
    toast({ title: `${plan.stops.length} tokens issued`, body: `Your errand run starts ${tm(plan.start)}. Tickets are in your wallet.`, tone: 'go', action: { label: 'My tickets', to: '/tickets' } });
  };

  const share = async () => {
    if (!plan) return;
    const lines = [`Skiply errand run from ${location.name} · ${MODES[mode].label}`, `Leave ${tm(plan.start)}, all done by ${tm(plan.end)} (${dur(plan.total)})`,
      ...plan.stops.map((s, i) => `${i + 1}. ${tm(s.arrive)} ${s.place.name} (${CATEGORIES[s.place.category].singular}, ~${fmtWait(s.wait)} wait)`)];
    const text = lines.join('\n');
    try {
      if (navigator.share) { await navigator.share({ title: 'My Skiply errand run', text }); return; }
      await navigator.clipboard.writeText(text);
      toast({ title: 'Plan copied', body: 'Paste it anywhere to share your route.', tone: 'info' });
    } catch (err) { if (err?.name !== 'AbortError') toast({ title: 'Could not share', body: 'Your browser blocked sharing.', tone: 'warn' }); }
  };

  return (
    <main className="errands">
      <section className="wrap er-hero">
        <div className="er-hero-copy">
          <p className="kicker">Errand run · route planner · from {location.name}</p>
          <h1 className="h1 er-title">Run every errand.<br /><em>Stand in none.</em></h1>
          <p className="lede">Pick the counters you need today. Skiply tries every order and every nearby branch, predicts each line at the minute you’ll walk in, and hands you the fastest itinerary.</p>
        </div>
        <div className="er-hero-art" aria-hidden="true">
          {cats.map((k, i) => (
            <span key={k} className="er-art-stop" style={{ '--c': CATEGORIES[k].color, '--i': i }}>
              <Emblem category={k} size={18} />
            </span>
          ))}
        </div>
      </section>

      <section className="wrap er-controls" data-reveal>
        <div className="er-step">
          <span className="er-step-n mono">01</span>
          <div className="er-step-body">
            <p className="kicker">Choose your platforms <span className="er-count">{cats.length}/{MAX_STOPS}</span></p>
            <div className="er-chips">
              {CATEGORY_LIST.map((c) => {
                const on = cats.includes(c.key);
                const order = cats.indexOf(c.key) + 1;
                return (
                  <button key={c.key} className={`er-chip ${on ? 'is-on' : ''}`} style={{ '--c': c.color, '--cn': c.neon }} aria-pressed={on}
                    onClick={() => toggleCat(c.key)} disabled={!on && cats.length >= MAX_STOPS}>
                    <span className="er-chip-ico"><Emblem category={c.key} size={18} /></span>
                    <span className="er-chip-t"><b>{c.label}</b><span className="mono">{loading && counts[c.key] == null ? '…' : `${counts[c.key] || 0} nearby`}</span></span>
                    <span className="er-chip-n mono">{on ? order : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="er-row2">
          <div className="er-step">
            <span className="er-step-n mono">02</span>
            <div className="er-step-body">
              <p className="kicker">Leave at <b className="er-leave">{offset === 0 ? 'now' : tm(startMs)}</b></p>
              <input className="er-range" type="range" min="0" max={MAX_OFFSET} step={STEP} value={offset}
                onChange={(e) => setOffset(+e.target.value)} aria-label="Start time" aria-valuetext={tm(startMs)}
                style={{ '--k': `${(offset / MAX_OFFSET) * 100}%` }} />
              <div className="er-scale mono"><span>NOW</span><span>+4H</span><span>+8H</span><span>+12H</span><span>+16H</span></div>
              <div className="er-quick">
                {[[0, 'Now'], [60, '+1 h'], [180, '+3 h'], [480, '+8 h']].map(([v, l]) => (
                  <button key={v} className="chip" aria-pressed={offset === v} onClick={() => setOffset(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="er-step">
            <span className="er-step-n mono">03</span>
            <div className="er-step-body">
              <p className="kicker">Getting around</p>
              <div className="er-modes" role="radiogroup" aria-label="Travel mode">
                {Object.values(MODES).map((m) => (
                  <button key={m.key} role="radio" aria-checked={mode === m.key} className={`er-mode ${mode === m.key ? 'is-on' : ''}`} onClick={() => setMode(m.key)}>
                    <ModeIcon k={m.key} size={22} />
                    <b>{m.label}</b>
                    <span className="mono">{m.kmh} KM/H{m.overhead ? ` · +${m.overhead}M` : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap er-result">
        {cats.length < 2 && (
          <div className="empty er-empty">
            <p className="display empty-t">One stop isn’t a run.</p>
            <p className="muted">Pick at least two platforms above and Skiply will plan the route.</p>
          </div>
        )}
        {cats.length >= 2 && loading && !places.length && (
          <div className="er-loading">
            <SplitFlap text="ROUTING" size={9} stagger={70} className="er-loading-flap" />
            <p className="mono muted">CONTACTING OPENSTREETMAP FOR VENUES AROUND {location.name.toUpperCase()}…</p>
          </div>
        )}
        {cats.length >= 2 && !loading && !places.length && (
          <div className="empty er-empty">
            <p className="display empty-t">No venues found.</p>
            <p className="muted">{error ? `OpenStreetMap is not responding (${error}). Try again in a moment.` : 'Nothing mapped within 3 km. Try another station.'}</p>
          </div>
        )}
        {result?.error && places.length > 0 && (
          <div className="notice">
            {result.error === 'none'
              ? <span><b>No open {CATEGORIES[result.cat].label.toLowerCase()} nearby</b> at {tm(startMs)}. Remove it, or pick a later start.</span>
              : <span><b>Something closes before you get there.</b> Try an earlier start or fewer stops.</span>}
            <span className="er-notice-acts">
              {nextWorking != null && <button className="btn btn-ink btn-sm" onClick={() => setOffset(nextWorking)}>Plan for {tm(base + nextWorking * 60000)} →</button>}
              {result.error === 'none' && <button className="btn btn-line btn-sm" onClick={() => toggleCat(result.cat)}>Remove {CATEGORIES[result.cat].singular.toLowerCase()}</button>}
            </span>
          </div>
        )}

        {plan && (
          <div className="er-plan" data-reveal>
            <header className="er-summary board">
              <div className="er-sum-main">
                <span className="er-sum-k mono">TOTAL JOURNEY · {MODES[mode].label.toUpperCase()}</span>
                <SplitFlap text={flapDur(plan.total)} size={7} className="er-sum-flap" stagger={55} />
                <span className="er-sum-sub mono">{tm(plan.start)} → {tm(plan.end)} · {plan.stops.length} STOPS · {plan.km.toFixed(1)} KM</span>
              </div>
              <div className="er-sum-split" aria-label="Time breakdown">
                {[['travel', plan.travel, 'ON THE MOVE'], ['wait', plan.wait, 'IN LINE'], ['service', plan.service, 'AT THE COUNTER']].map(([k, v, l]) => (
                  <div key={k} className={`er-bar er-bar-${k}`}>
                    <span className="er-bar-l mono">{l}</span>
                    <span className="er-bar-track"><i style={{ width: `${Math.max(4, (v / Math.max(1, plan.total)) * 100)}%` }} /></span>
                    <b className="mono">{v}M</b>
                  </div>
                ))}
              </div>
              <div className="er-save">
                {saved != null && saved > 0 ? (
                  <><span className="er-save-n display">−{saved}<small>min</small></span><span className="mono">VS NEAREST-FIRST IN YOUR ORDER</span></>
                ) : !naive ? (
                  <><span className="er-save-n display er-save-x">✕</span><span className="mono">NEAREST-FIRST HITS A CLOSED COUNTER</span></>
                ) : (
                  <><span className="er-save-n display">✓</span><span className="mono">YOUR ORDER IS ALREADY THE FASTEST</span></>
                )}
              </div>
            </header>

            <div className="er-grid">
              <ol className="er-line" aria-label="Itinerary">
                <li className="er-node er-start">
                  <span className="er-dot"><ModeIcon k={mode} /></span>
                  <div className="er-node-body">
                    <span className="er-time mono">{tm(plan.start)}</span>
                    <b className="er-node-t">Depart {location.name}</b>
                    <span className="muted small">{location.source === 'gps' ? 'From your current location' : 'From the station centre'}</span>
                  </div>
                </li>
                {plan.stops.map((s, i) => {
                  const cat = CATEGORIES[s.place.category];
                  const pool = result.pools[s.place.category] || [];
                  return (
                    <React.Fragment key={s.place.id}>
                      <li className="er-leg">
                        <span className="er-leg-ico"><ModeIcon k={mode} size={14} /></span>
                        <span className="mono">{s.leg.min} MIN {MODES[mode].verb.toUpperCase()} · {fmtKm(s.leg.km)}</span>
                      </li>
                      <li className="er-node er-stop" style={{ '--c': cat.color, '--cn': cat.neon, '--i': i }}>
                        <span className="er-dot er-dot-n"><b>{i + 1}</b></span>
                        <div className="er-node-body er-card">
                          <div className="er-card-top">
                            <span className="er-time mono">ARR {tm(s.arrive)}</span>
                            <span className="er-plat mono"><Emblem category={cat.key} size={13} /> PLAT {cat.platform} · {cat.singular.toUpperCase()}</span>
                          </div>
                          <Link to={`/place/${s.place.id}`} state={{ place: s.place }} className="er-node-t er-venue">{s.place.name}</Link>
                          {s.place.address && <span className="muted small er-addr">{s.place.address}</span>}
                          <div className="er-stats">
                            <span><em className="mono">WAIT</em><b>{fmtWait(s.wait)}</b><small className="muted">≈{s.people} ahead</small></span>
                            <span><em className="mono">SERVICE</em><b>{s.service} min</b><small className="muted">{cat.departments[0]}</small></span>
                            <span><em className="mono">LEAVE</em><b>{tm(s.leave)}</b><small className="muted">{fmtKm(s.place.distance ?? 0)} from start</small></span>
                          </div>
                          {pool.length > 0 && (
                            <label className="er-lock">
                              <span className="mono">BRANCH</span>
                              <select value={locks[cat.key] || ''} onChange={(e) => setLocks((l) => ({ ...l, [cat.key]: e.target.value || undefined }))}>
                                <option value="">Auto · Skiply picks the fastest</option>
                                {places.filter((p) => p.category === cat.key).slice(0, 8).map((p) => (
                                  <option key={p.id} value={p.id}>{p.name} · {fmtKm(p.distance)}</option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                      </li>
                    </React.Fragment>
                  );
                })}
                <li className="er-node er-end">
                  <span className="er-dot er-dot-end">✓</span>
                  <div className="er-node-body">
                    <span className="er-time mono">{tm(plan.end)}</span>
                    <b className="er-node-t">All errands done</b>
                    <span className="muted small">{plan.wait <= 15 ? 'Barely any standing. That’s the point.' : `About ${plan.wait} minutes in line in total, the least we could find.`}</span>
                  </div>
                </li>
              </ol>

              <aside className="er-side">
                <RouteMap origin={origin} you={location} stops={plan.stops} />
                <div className="er-actions">
                  <button className="btn btn-ink" onClick={takeAll} disabled={taken}>{taken ? '✓ Tokens issued' : `Take ${plan.stops.length} tokens`} {!taken && <span aria-hidden="true">→</span>}</button>
                  <button className="btn btn-line" onClick={share}>Share plan</button>
                  {taken && <Link to="/tickets" className="btn btn-ghost">Open wallet ↗</Link>}
                </div>
                <p className="muted small er-fine">Waits are Skiply estimates for the minute you arrive. Travel uses straight-line distance × 1.3 at typical city speeds. Tokens are booked as slots at each arrival time.</p>
              </aside>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/** Leaflet map with numbered stops and a dashed route line. */
function RouteMap({ origin, you, stops }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null);
  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, scrollWheelZoom: false }).setView([origin.lat, origin.lng], 14);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const m = map.current;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    const pts = [[origin.lat, origin.lng], ...stops.map((s) => [s.place.lat, s.place.lng])];
    L.polyline(pts, { color: '#000', weight: 7, opacity: 0.18, className: 'er-route-shadow' }).addTo(g);
    L.polyline(pts, { weight: 3.5, dashArray: '2 9', lineCap: 'round', className: 'er-route' }).addTo(g);
    L.marker([you.lat, you.lng], { icon: L.divIcon({ className: '', html: '<span class="pin-you"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(g);
    stops.forEach((s, i) => {
      const cat = CATEGORIES[s.place.category];
      const icon = L.divIcon({ className: '', html: `<span class="er-pin" style="--c:${cat.color}"><b>${i + 1}</b></span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
      L.marker([s.place.lat, s.place.lng], { icon, title: s.place.name }).bindTooltip(`${i + 1}. ${s.place.name}`, { direction: 'top', offset: [0, -14], className: 'pin-tip' }).addTo(g);
    });
    map.current.fitBounds(L.latLngBounds(pts).pad(0.25), { animate: true, maxZoom: 16 });
  }, [origin, you, stops]);

  return <div ref={el} className="placemap er-map" role="img" aria-label="Route map" />;
}
