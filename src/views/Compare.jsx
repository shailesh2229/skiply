import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNow, useReveal } from '../lib/hooks';
import { CATEGORIES } from '../data/categories';
import { dayForecast, estimateAt, fmtWait, hoursFor } from '../lib/estimate';
import { fmtMin, rangesForDate } from '../lib/hours';
import { distanceKm, fmtKm } from '../lib/geo';
import Emblem from '../ui/Emblem';
import '../styles/pulse.css';

const DASH = ['', '7 5', '2 5'];
const MIN_PER_KM = 4; // rough city travel time used to break ties

function hoursToday(p, d) {
  const { parsed } = hoursFor(p);
  if (parsed?.always) return 'Open 24 hours';
  const r = rangesForDate(parsed, d);
  return r.length ? r.map((x) => `${fmtMin(x[0])} – ${fmtMin(x[1] % 1440)}`).join(', ') : 'Closed today';
}

function Chart({ rows, hour }) {
  const [hover, setHover] = useState(null);
  const W = 720, H = 240, P = { l: 40, r: 14, t: 16, b: 28 };
  const max = Math.max(10, ...rows.flatMap((r) => r.fc.map((x) => (x.status.open === false ? 0 : x.wait))));
  const nice = Math.ceil(max / 10) * 10;
  const X = (h) => P.l + (h / 23) * (W - P.l - P.r);
  const Y = (v) => H - P.b - (v / nice) * (H - P.t - P.b);
  return (
    <div className="cmp-chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Estimated wait through the day for each venue"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const h = Math.round((((e.clientX - r.left) / r.width) * W - P.l) / ((W - P.l - P.r) / 23));
          setHover(Math.max(0, Math.min(23, h)));
        }}>
        {[0, 0.25, 0.5, 0.75, 1].map((k) => (
          <g key={k}>
            <line x1={P.l} x2={W - P.r} y1={Y(nice * k)} y2={Y(nice * k)} className="cmp-grid" />
            <text x={P.l - 8} y={Y(nice * k) + 4} className="cmp-ax" textAnchor="end">{Math.round(nice * k)}m</text>
          </g>
        ))}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => <text key={h} x={X(h)} y={H - 8} className="cmp-ax" textAnchor="middle">{fmtMin(h * 60).replace(':00', '')}</text>)}
        <line x1={X(hour)} x2={X(hour)} y1={P.t} y2={H - P.b} className="cmp-now" />
        <text x={hour > 20 ? X(hour) - 5 : X(hour) + 5} y={P.t + 10} className="cmp-now-t" textAnchor={hour > 20 ? 'end' : 'start'}>NOW</text>
        {rows.map((r, i) => {
          const d = r.fc.map((x, h) => `${h ? 'L' : 'M'}${X(h).toFixed(1)} ${Y(x.status.open === false ? 0 : x.wait).toFixed(1)}`).join(' ');
          return (
            <g key={r.p.id} className="pz-cc" style={{ '--c': r.color, '--cn': r.neon }}>
              <path d={`${d} L${X(23)} ${Y(0)} L${X(0)} ${Y(0)} Z`} className="cmp-area" />
              <path d={d} className="cmp-line" strokeDasharray={DASH[i]} />
              <circle cx={X(hour)} cy={Y(r.est.status.open === false ? 0 : r.est.wait)} r="5" className="cmp-dot" />
            </g>
          );
        })}
        {hover != null && <line x1={X(hover)} x2={X(hover)} y1={P.t} y2={H - P.b} className="cmp-hov" />}
      </svg>
      {hover != null && (
        <div className="cmp-tip" style={{ left: `${(X(hover) / W) * 100}%` }}>
          <span className="mono">{fmtMin(hover * 60)}</span>
          {rows.map((r) => (
            <span key={r.p.id} className="pz-cc" style={{ '--c': r.color, '--cn': r.neon }}>
              <i />{r.p.name.length > 22 ? `${r.p.name.slice(0, 21)}…` : r.p.name}
              <b>{r.fc[hover].status.open === false ? 'closed' : fmtWait(r.fc[hover].wait)}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Compare() {
  const { compare, toggleCompare, clearCompare, location } = useApp();
  const now = useNow(30000);
  useReveal();
  const d = new Date(now);
  const hour = d.getHours();

  const rows = useMemo(() => {
    const seen = {};
    return compare.map((p) => {
      const cat = CATEGORIES[p.category];
      // Same-category venues would share a colour: swap tones for the 2nd, use ink for the 3rd.
      const n = (seen[p.category] = (seen[p.category] || 0) + 1);
      const color = n === 1 ? cat.color : n === 2 ? cat.neon : 'var(--ink)';
      const neon = n === 1 ? cat.neon : n === 2 ? cat.color : 'var(--ink)';
      const est = estimateAt(p, new Date(now));
      const fc = dayForecast(p, new Date(now));
      const dist = location ? distanceKm(location, p) : null;
      const quiet = fc.filter((x) => x.hour > hour && x.status.open !== false).sort((a, b) => a.wait - b.wait)[0];
      const closed = est.status.open === false;
      const score = closed ? Infinity : est.wait + (dist || 0) * MIN_PER_KM;
      return { p, cat, est, fc, dist, quiet, closed, score, color, neon };
    });
  }, [compare, now, location, hour]);

  const ranked = [...rows].filter((r) => r.score < Infinity).sort((a, b) => a.score - b.score);
  const pick = ranked[0];
  const runner = ranked[1];
  const reason = pick && (runner
    ? `${fmtWait(pick.est.wait)} wait${pick.dist != null ? ` and ${fmtKm(pick.dist)} away` : ''}: about ${Math.max(1, Math.round(runner.score - pick.score))} min sooner at the counter than ${runner.p.name}, travel included.`
    : `the only one of these open right now (${fmtWait(pick.est.wait)} wait).`);

  if (!compare.length) {
    return (
      <main className="cmp">
        <div className="wrap empty empty-page cmp-empty">
          <div className="cmp-empty-art" aria-hidden="true"><span /><span /><span /></div>
          <p className="kicker">Compare · up to three venues</p>
          <p className="display empty-t">Nothing on the scales yet.</p>
          <p className="muted">Tap <b>Compare</b> on any venue card or venue page to add it here. Line up two hospitals, three banks, or a salon against a clinic, and Skiply picks the quickest overall.</p>
          <Link to="/explore" className="btn btn-ink">Browse departures →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cmp">
      <div className="wrap">
        <header className="cmp-head">
          <div>
            <p className="kicker">Compare · {rows.length} of 3 · live estimates</p>
            <h1 className="h1">Which line <em>moves first?</em></h1>
          </div>
          <div className="cmp-head-a">
            {rows.length < 3 && <Link to="/explore" className="btn btn-line btn-sm">+ Add a venue</Link>}
            <button className="btn btn-ghost btn-sm" onClick={clearCompare}>Clear all</button>
          </div>
        </header>

        {pick && (
          <section className="cmp-pick pz-cc" style={{ '--c': pick.color, '--cn': pick.neon }} data-reveal>
            <span className="cmp-crown" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4z" fill="currentColor" /></svg>
            </span>
            <div>
              <p className="kicker">Skiply pick</p>
              <p className="cmp-pick-t"><b>{pick.p.name}</b> — {reason}</p>
            </div>
            <Link to={`/place/${pick.p.id}`} state={{ place: pick.p }} className="btn btn-ink btn-sm">Take a token →</Link>
          </section>
        )}

        <div className={`cmp-cols n-${rows.length}`}>
          {rows.map((r, i) => {
            const win = pick && pick.p.id === r.p.id;
            return (
              <article key={r.p.id} className={`cmp-col pz-cc ${win ? 'is-win' : ''}`} style={{ '--c': r.color, '--cn': r.neon, transitionDelay: `${i * 70}ms` }} data-reveal>
                {win && <span className="cmp-badge mono">★ PICK</span>}
                <button className="cmp-x" onClick={() => toggleCompare(r.p)} aria-label={`Remove ${r.p.name}`}>×</button>
                <div className="cmp-id">
                  <span className="cmp-ico"><Emblem category={r.p.category} size={22} /></span>
                  <span className="kicker">Plat. {r.cat.platform} · {r.cat.singular}</span>
                </div>
                <h2 className="cmp-name">{r.p.name}</h2>
                <p className="cmp-addr muted">{r.p.address || 'Street address not mapped'}</p>

                <div className="cmp-big">
                  <span className="kicker">Wait now · est.</span>
                  <span className="display cmp-wait">{r.closed ? 'Closed' : fmtWait(r.est.wait)}</span>
                  <span className="cmp-line-key"><i style={{ borderTopStyle: i === 1 ? 'dashed' : i === 2 ? 'dotted' : 'solid' }} /> on the chart</span>
                </div>

                <dl className="cmp-facts">
                  <dt>In line</dt><dd className="mono">{r.closed ? '—' : `≈ ${r.est.people}`}</dd>
                  <dt>Status</dt><dd><span className={`dot ${r.closed ? 'dot-stop' : 'dot-go'}`} /> {r.est.status.label || 'Hours unknown'}</dd>
                  <dt>Distance</dt><dd className="mono">{r.dist != null ? `${fmtKm(r.dist)} · ~${Math.max(3, Math.round(r.dist * MIN_PER_KM))} min` : '—'}</dd>
                  <dt>Quietest later</dt><dd className="mono">{r.quiet ? `${fmtMin(r.quiet.hour * 60)} · ${fmtWait(r.quiet.wait)}` : 'No more hours today'}</dd>
                  <dt>Hours today</dt><dd>{hoursToday(r.p, d)}</dd>
                </dl>
                <Link to={`/place/${r.p.id}`} state={{ place: r.p }} className={`btn ${win ? 'btn-ink' : 'btn-line'} cmp-go`}>{r.closed ? 'Book a slot →' : 'Take a token →'}</Link>
              </article>
            );
          })}
          {rows.length < 3 && (
            <Link to="/explore" className="cmp-col cmp-add" data-reveal>
              <span className="cmp-add-plus">+</span>
              <b>Add a venue</b>
              <span className="muted small">Open any venue and press Compare.</span>
            </Link>
          )}
        </div>

        <section className="cmp-chart-sec" data-reveal>
          <div className="pz-sec-h">
            <div>
              <p className="kicker">Today’s forecast · overlaid</p>
              <h2 className="h3">Estimated wait, hour by hour</h2>
            </div>
            <div className="cmp-legend">
              {rows.map((r, i) => (
                <span key={r.p.id} className="pz-cc" style={{ '--c': r.color, '--cn': r.neon }}>
                  <i style={{ borderTopStyle: i === 1 ? 'dashed' : i === 2 ? 'dotted' : 'solid' }} />{r.p.name}
                </span>
              ))}
            </div>
          </div>
          <Chart rows={rows} hour={hour} />
        </section>
        <p className="pz-foot mono">SKIPLY PICK = LOWEST (ESTIMATED WAIT + ~{MIN_PER_KM} MIN PER KM OF TRAVEL) AMONG OPEN VENUES</p>
      </div>
    </main>
  );
}
