import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dayForecast, fmtWait } from '../../../lib/estimate';
import { fmtMin } from '../../../lib/hours';
import Emblem from '../../../ui/Emblem';
import CountUp from '../../../ui/CountUp';
import PageHead from './PageHead';
import { useSim } from './SimContext';

const GUIDE = [
  ['The sentence at the top', 'tells you how your line looks right now, in one line.'],
  ['Call next customer', 'gives the next person in line to a free counter and announces their token.'],
  ['The four boxes', 'show people waiting, people served today, how long a new arrival will wait, and counters open.'],
  ['What should I do now?', 'gives simple suggestions, like opening another counter before the busy hour.'],
];

function useTips(sim, venue) {
  return useMemo(() => {
    const tips = [];
    const now = new Date();
    const fc = dayForecast(venue, now);
    const h = now.getHours();
    const ahead = fc.filter((x) => x.hour > h && x.status.open !== false);
    const peak = ahead.sort((a, b) => b.people - a.people)[0];
    const perCounter = sim.open ? sim.queue.length / sim.open : Infinity;
    if (!sim.open) tips.push(['warn', 'All counters are closed.', 'Open at least one counter so people can be served.']);
    else if (perCounter > 6) tips.push(['warn', `The line is long: about ${Math.round(perCounter)} people per counter.`, 'Open another counter if you have someone free.']);
    else if (!sim.queue.length) tips.push(['ok', 'Nobody is waiting right now.', 'A good moment for a tea break or to tidy up.']);
    else tips.push(['ok', 'Your line is moving well.', 'Keep calling customers as counters free up.']);
    if (peak && peak.people > 0) tips.push(['info', `It usually gets busiest around ${fmtMin(peak.hour * 60)}.`, sim.open < sim.max ? 'Plan to have an extra counter open by then.' : 'All your counters are already open.']);
    const app = sim.queue.filter((p) => p.source === 'app').length;
    if (app) tips.push(['info', `${app} ${app === 1 ? 'person' : 'people'} booked through Skiply.`, 'They’re marked “Booked online” in your line.']);
    return tips.slice(0, 3);
  }, [sim.open, sim.queue, sim.max, venue]); // eslint-disable-line react-hooks/exhaustive-deps
}

function DayChart({ venue }) {
  const now = new Date();
  const data = useMemo(() => dayForecast(venue, now), [venue, now.getDate()]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(4, ...data.map((d) => d.people));
  const h = now.getHours();
  return (
    <div className="hm-chart" role="img" aria-label="How busy your business usually gets today, hour by hour">
      {data.map((d) => (
        <div key={d.hour} className={`hm-bar ${d.hour === h ? 'is-now' : ''} ${d.status.open === false ? 'is-closed' : ''}`} title={`${fmtMin(d.hour * 60)}: about ${d.people} waiting`}>
          <span style={{ height: `${d.status.open === false ? 3 : Math.max(4, (d.people / max) * 100)}%` }} />
          <em>{d.hour % 3 === 0 ? fmtMin(d.hour * 60).replace(':00 ', '') : d.hour === h ? 'now' : ''}</em>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const sim = useSim();
  const { venue } = sim;
  const tips = useTips(sim, venue);
  const next = sim.queue[0];
  const serving = sim.counters.filter((c) => c.serving);

  const sentence = !sim.open
    ? 'All counters are closed, so nobody is being served.'
    : sim.queue.length
      ? `${sim.queue.length} ${sim.queue.length === 1 ? 'person is' : 'people are'} waiting. The next token is ${next.token}. New arrivals wait about ${fmtWait(sim.waitNow)}.`
      : 'Nobody is waiting right now. New arrivals will be served straight away.';

  return (
    <div className="sp">
      <PageHead title="Good to see you." accent={venue.name.split(' ').slice(0, 3).join(' ')} lead="Here’s your business today, at a glance." guide={GUIDE} />

      <section className="hm-hero">
        <span className="hm-ico"><Emblem category={venue.category} size={26} /></span>
        <p className="hm-sentence">{sentence}</p>
        <div className="hm-cta">
          <button className="sp-btn sp-btn-primary sp-btn-xl" onClick={() => sim.callNext()} disabled={!sim.queue.length || !sim.open}>
            Call next customer{next ? ` (${next.token})` : ''}
          </button>
          <button className="sp-btn sp-btn-xl" onClick={sim.addWalkIn}>+ Add a walk-in</button>
        </div>
        {serving.length > 0 && (
          <p className="hm-serving">Now at the counters: {serving.map((c) => <b key={c.id}>{c.serving.token} → Counter {c.id}</b>)}</p>
        )}
      </section>

      <section className="hm-cards">
        <div className="hm-card hm-c1"><span>People waiting</span><b><CountUp value={sim.queue.length} duration={400} /></b><em>in your line right now</em></div>
        <div className="hm-card hm-c2"><span>Served today</span><b><CountUp value={sim.served} duration={400} /></b><em>customers finished</em></div>
        <div className="hm-card hm-c3"><span>Wait for a new arrival</span><b>{sim.waitNow == null ? '—' : fmtWait(sim.waitNow)}</b><em>if someone walks in now</em></div>
        <div className="hm-card hm-c4">
          <span>Counters open</span><b>{sim.open}<small> of {sim.max}</small></b>
          <div className="hm-mini">
            <button onClick={() => sim.setOpenCount(Math.max(0, sim.open - 1))} aria-label="Close a counter">− Close one</button>
            <button onClick={() => sim.setOpenCount(Math.min(sim.max, sim.open + 1))} aria-label="Open a counter">+ Open one</button>
          </div>
        </div>
      </section>

      <div className="hm-row">
        <section className="sp-panel">
          <h2 className="sp-h2">What should I do now?</h2>
          <ul className="hm-tips">
            {tips.map(([k, b, t]) => <li key={b} className={`tip-${k}`}><i aria-hidden="true">{k === 'warn' ? '!' : k === 'ok' ? '✓' : 'i'}</i><span><b>{b}</b> {t}</span></li>)}
          </ul>
          <div className="hm-links">
            <Link to="/business-panel/queue" className="sp-link">Open the live queue →</Link>
            <Link to="/business-panel/display" className="sp-link">Show the TV screen →</Link>
          </div>
        </section>
        <section className="sp-panel">
          <h2 className="sp-h2">How busy today usually gets</h2>
          <p className="sp-muted">Taller bars mean more people waiting at that hour. The bright bar is now.</p>
          <DayChart venue={venue} />
        </section>
      </div>
    </div>
  );
}
