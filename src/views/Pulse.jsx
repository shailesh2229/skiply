import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNearby, useNow, useReveal } from '../lib/hooks';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';
import { fmtMin } from '../lib/hours';
import { fmtKm } from '../lib/geo';
import Emblem from '../ui/Emblem';
import { DigitalClock } from '../ui/Clock';
import '../styles/pulse.css';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const PER_CAT = 40; // venues sampled per platform for the heatmap
const catVars = (k) => ({ '--c': CATEGORIES[k].color, '--cn': CATEGORIES[k].neon });
const hLabel = (h) => fmtMin(h * 60).replace(':00', '');

function stressOf(avg) {
  const v = Math.max(0, Math.min(100, Math.round((avg / 45) * 100)));
  const label = v < 25 ? 'Calm' : v < 50 ? 'Steady' : v < 75 ? 'Rush hour' : 'Gridlock';
  return { v, label };
}

function Gauge({ value, label, loading }) {
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = setTimeout(() => setShown(value), 80); return () => clearTimeout(id); }, [value]);
  const R = 120, cx = 150, cy = 150;
  const arc = (from, to) => {
    const a = Math.PI * (1 - from), b = Math.PI * (1 - to);
    return `M${cx + R * Math.cos(a)} ${cy - R * Math.sin(a)} A${R} ${R} 0 0 1 ${cx + R * Math.cos(b)} ${cy - R * Math.sin(b)}`;
  };
  const ticks = Array.from({ length: 21 }, (_, i) => i / 20);
  return (
    <div className="pz-gauge" role="img" aria-label={`Stress index ${value} of 100, ${label}`}>
      <svg viewBox="0 0 300 175">
        <defs>
          <linearGradient id="pzG" x1="0" x2="1">
            <stop offset="0" stopColor="#2EE07A" />
            <stop offset=".45" stopColor="#F2B233" />
            <stop offset=".75" stopColor="#FF7A1A" />
            <stop offset="1" stopColor="#FF3B5C" />
          </linearGradient>
        </defs>
        <path d={arc(0, 1)} className="pz-g-track" />
        <path d={arc(0, 1)} className="pz-g-fill" stroke="url(#pzG)" style={{ strokeDasharray: `${Math.PI * R}`, strokeDashoffset: `${Math.PI * R * (1 - shown / 100)}` }} />
        {ticks.map((t) => {
          const a = Math.PI * (1 - t), r1 = R - 22, r2 = R - (t * 20 % 5 === 0 ? 34 : 28);
          return <line key={t} className="pz-g-tick" x1={cx + r1 * Math.cos(a)} y1={cy - r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cy - r2 * Math.sin(a)} />;
        })}
        <g className="pz-g-needle" style={{ transform: `rotate(${-90 + (shown / 100) * 180}deg)` }}>
          <path d={`M${cx - 4} ${cy} L${cx} ${cy - R + 30} L${cx + 4} ${cy} Z`} />
          <circle cx={cx} cy={cy} r="9" />
        </g>
      </svg>
      <div className="pz-g-read">
        <span className="pz-g-n display">{loading ? '—' : shown}</span>
        <span className="pz-g-l mono">{loading ? 'READING THE CITY…' : label.toUpperCase()}</span>
      </div>
    </div>
  );
}

function Spark({ values, now }) {
  const max = Math.max(5, ...values.map((v) => v ?? 0));
  const pts = values.map((v, h) => [h * (100 / 23), 30 - ((v ?? 0) / max) * 26]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg className="pz-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L100 32 L0 32 Z`} className="pz-spark-a" />
      <path d={d} className="pz-spark-l" />
      <line x1={now * (100 / 23)} x2={now * (100 / 23)} y1="0" y2="32" className="pz-spark-now" />
    </svg>
  );
}

function Rank({ title, kicker, rows, empty, max, busy }) {
  return (
    <section className="pz-rank" data-reveal>
      <p className="kicker">{kicker}</p>
      <h3 className="h3">{title}</h3>
      <ol>
        {rows.map(({ p, e, note }, i) => (
          <li key={p.id} style={catVars(p.category)} className="pz-cc">
            <Link to={`/place/${p.id}`} state={{ place: p }}>
              <span className="pz-rank-i mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="pz-rank-ico"><Emblem category={p.category} size={16} /></span>
              <span className="pz-rank-t"><b>{p.name}</b><span className="muted">{CATEGORIES[p.category].singular} · {fmtKm(p.distance)}{note ? ` · ${note}` : ''}</span></span>
              {max != null && (
                <span className="pz-rank-v">
                  <b className={`mono ${busy ? 'is-busy' : ''}`}>{fmtWait(e.wait)}</b>
                  <span className="pz-bar"><i style={{ width: `${Math.max(4, (e.wait / max) * 100)}%` }} /></span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
      {!rows.length && <p className="muted small pz-rank-empty">{empty}</p>}
    </section>
  );
}

export default function Pulse() {
  const { location } = useApp();
  const { places, loading, error } = useNearby(location);
  const now = useNow(30000);
  const [day, setDay] = useState('today');
  const [tip, setTip] = useState(null);
  useReveal();

  const d = new Date(now);
  const hour = d.getHours();
  const withEst = useMemo(() => places.map((p) => ({ p, e: estimateAt(p, new Date(now)) })), [places, now]);
  const open = useMemo(() => withEst.filter((x) => x.e.status.open !== false), [withEst]);
  const avg = open.length ? open.reduce((s, x) => s + x.e.wait, 0) / open.length : 0;
  const stress = stressOf(avg);
  const people = open.reduce((s, x) => s + x.e.people, 0);

  const baseDay = useMemo(() => {
    const b = new Date(now);
    if (day === 'weekend') b.setDate(b.getDate() + ((6 - b.getDay() + 7) % 7));
    return b;
  }, [day, Math.floor(now / 3600000)]); // eslint-disable-line react-hooks/exhaustive-deps

  const heat = useMemo(() => CATEGORY_LIST.map((c) => {
    const venues = places.filter((p) => p.category === c.key).slice(0, PER_CAT);
    const cells = HOURS.map((h) => {
      const t = new Date(baseDay); t.setHours(h, 30, 0, 0);
      const ws = venues.map((p) => estimateAt(p, t)).filter((e) => e.status.open !== false).map((e) => e.wait);
      return ws.length ? { avg: Math.round(ws.reduce((a, b) => a + b, 0) / ws.length), open: ws.length } : null;
    });
    const later = cells.map((x, h) => ({ x, h })).filter(({ x, h }) => x && (day === 'weekend' || h >= hour));
    const best = later.sort((a, b) => a.x.avg - b.x.avg)[0];
    return { c, count: venues.length, cells, best: best ? best.h : null };
  }), [places, baseDay, day, hour]);
  const heatMax = Math.max(10, ...heat.flatMap((r) => r.cells.map((x) => x?.avg || 0)));

  const shortest = useMemo(() => [...open].filter((x) => x.p.distance < 3).sort((a, b) => a.e.wait - b.e.wait || a.p.distance - b.p.distance).slice(0, 5), [open]);
  const longest = useMemo(() => [...open].sort((a, b) => b.e.wait - a.e.wait).slice(0, 5), [open]);
  const rankMax = Math.max(10, ...longest.map((x) => x.e.wait));
  const opening = useMemo(() => withEst.filter((x) => x.e.status.open === false).map((x) => {
    for (let m = 5; m <= 60; m += 5) {
      const e = estimateAt(x.p, new Date(now + m * 60000));
      if (e.status.open !== false) return { ...x, note: `opens in ~${m} min`, m };
    }
    return null;
  }).filter(Boolean).sort((a, b) => a.m - b.m || a.p.distance - b.p.distance).slice(0, 5), [withEst, now]);
  const closing = useMemo(() => open.filter((x) => x.e.status.closesIn != null && x.e.status.closesIn <= 60)
    .sort((a, b) => a.e.status.closesIn - b.e.status.closesIn)
    .slice(0, 5).map((x) => ({ ...x, note: `closes in ${x.e.status.closesIn} min` })), [open]);

  const busy = loading && !places.length;

  return (
    <main className="pz">
      <section className="pz-hero">
        <div className="wrap pz-hero-in">
          <div className="pz-hero-t">
            <p className="kicker"><span className="dot dot-go pulse" /> Control room · {location.name}</p>
            <h1 className="h1">The city’s queues, <em>on one screen.</em></h1>
            <p className="lede">Every real hospital, bank, clinic, salon, restaurant, pharmacy and post office within 3 km, read as one living system. Updated every 30 seconds from Skiply estimates.</p>
            <div className="pz-hero-stats mono">
              <span><b>{busy ? '—' : places.length}</b>VENUES</span>
              <span><b>{busy ? '—' : open.length}</b>OPEN NOW</span>
              <span><b>{busy ? '—' : people.toLocaleString('en-IN')}</b>EST. IN LINE</span>
              <span><b>{busy ? '—' : fmtWait(Math.round(avg))}</b>AVG WAIT</span>
            </div>
          </div>
          <div className="pz-hero-g">
            <div className="pz-g-head mono"><span>STRESS INDEX</span><DigitalClock /></div>
            <Gauge value={stress.v} label={stress.label} loading={busy} />
            <div className="pz-g-scale mono"><span>CALM</span><span>STEADY</span><span>RUSH</span><span>GRIDLOCK</span></div>
          </div>
        </div>
      </section>

      <div className="wrap">
        {error && !places.length && (
          <div className="notice"><b>OpenStreetMap didn’t answer.</b> The public servers can be busy, so try again in a moment.
            <button className="btn btn-line btn-sm" onClick={() => window.location.reload()}>Retry</button></div>
        )}

        <section className="pz-sec" data-reveal>
          <header className="pz-sec-h">
            <div>
              <p className="kicker">Heatmap · average estimated wait by hour</p>
              <h2 className="h2">When each platform <em>boils over.</em></h2>
            </div>
            <div className="pz-toggle" role="tablist" aria-label="Day">
              <button className="chip" aria-pressed={day === 'today'} onClick={() => setDay('today')}>Today</button>
              <button className="chip" aria-pressed={day === 'weekend'} onClick={() => setDay('weekend')}>Saturday</button>
            </div>
          </header>

          <div className="pz-heat-wrap" onMouseLeave={() => setTip(null)}>
            <div className="pz-heat" role="table" aria-label="Average estimated wait by platform and hour">
              <div className="pz-heat-row pz-heat-hrs mono" role="row">
                <span className="pz-heat-lab" />
                {HOURS.map((h) => <span key={h} className={`pz-heat-h ${day === 'today' && h === hour ? 'is-now' : ''}`}>{h % 3 === 0 ? hLabel(h) : ''}</span>)}
              </div>
              {heat.map(({ c, cells, best, count }) => (
                <div key={c.key} className="pz-heat-row pz-cc" role="row" style={catVars(c.key)}>
                  <Link to={`/explore?cat=${c.key}`} className="pz-heat-lab">
                    <Emblem category={c.key} size={16} /><span>{c.label}</span><i className="mono">{count}</i>
                  </Link>
                  {cells.map((x, h) => (
                    <span key={h} role="cell"
                      className={`pz-cell ${!x ? 'is-x' : ''} ${day === 'today' && h === hour ? 'is-now' : ''} ${best === h ? 'is-best' : ''} ${busy ? 'is-load' : ''}`}
                      style={x ? { '--k': `${Math.round(12 + (x.avg / heatMax) * 88)}%` } : undefined}
                      onMouseEnter={(ev) => {
                        const r = ev.currentTarget.getBoundingClientRect(), w = ev.currentTarget.closest('.pz-heat-wrap').getBoundingClientRect();
                        setTip({ x: r.left - w.left + r.width / 2, y: r.top - w.top, c, h, v: x });
                      }}>
                      {best === h && <b aria-label="best hour">★</b>}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            {tip && (
              <div className="pz-tip" style={{ left: tip.x, top: tip.y }}>
                <span className="mono">{tip.c.label.toUpperCase()} · {fmtMin(tip.h * 60)}</span>
                <b>{tip.v ? fmtWait(tip.v.avg) : 'Mostly closed'}</b>
                {tip.v && <span className="muted">{tip.v.open} venue{tip.v.open === 1 ? '' : 's'} open</span>}
              </div>
            )}
          </div>
          <p className="pz-legend mono"><span><i className="pz-lg-ramp" /> QUIETER → BUSIER</span><span>★ QUIETEST HOUR{day === 'today' ? ' LEFT TODAY' : ''}</span><span><i className="pz-lg-now" /> NOW</span></p>
        </section>

        <section className="pz-sec">
          <header className="pz-sec-h" data-reveal>
            <div>
              <p className="kicker">Leaderboards · live</p>
              <h2 className="h2">Who’s <em>moving,</em> who’s stuck.</h2>
            </div>
          </header>
          <div className="pz-ranks">
            <Rank kicker="Within 3 km" title="Shortest lines now" rows={shortest} max={rankMax} empty={busy ? 'Reading the board…' : 'Nothing open nearby right now.'} />
            <Rank kicker="Avoid for now" title="Longest lines now" rows={longest} max={rankMax} busy empty={busy ? 'Reading the board…' : 'Nothing open nearby right now.'} />
            <Rank kicker="Doors about to open" title="Opening within the hour" rows={opening} empty={busy ? 'Reading the board…' : 'Nothing opens in the next hour.'} />
            <Rank kicker="Last call" title="Closing within the hour" rows={closing} empty={busy ? 'Reading the board…' : 'Nothing closes in the next hour.'} />
          </div>
        </section>

        <section className="pz-sec">
          <header className="pz-sec-h" data-reveal>
            <div>
              <p className="kicker">Seven platforms</p>
              <h2 className="h2">Platform <em>health.</em></h2>
            </div>
          </header>
          <div className="pz-plats">
            {heat.map(({ c, cells, best }, i) => {
              const mine = withEst.filter((x) => x.p.category === c.key);
              const op = mine.filter((x) => x.e.status.open !== false);
              const a = op.length ? Math.round(op.reduce((s, x) => s + x.e.wait, 0) / op.length) : null;
              return (
                <Link key={c.key} to={`/explore?cat=${c.key}`} className="pz-plat pz-cc" style={{ ...catVars(c.key), transitionDelay: `${i * 50}ms` }} data-reveal>
                  <div className="pz-plat-top">
                    <span className="pz-plat-no display">{c.platform}</span>
                    <span className="pz-plat-ico"><Emblem category={c.key} size={20} /></span>
                  </div>
                  <b className="pz-plat-name">{c.label}</b>
                  {busy ? <span className="skeleton" style={{ height: 40, marginTop: 10 }} /> : (
                    <>
                      <div className="pz-plat-nums mono">
                        <span><b>{mine.length}</b>NEARBY</span>
                        <span><b>{op.length}</b>OPEN</span>
                        <span><b>{a == null ? '—' : `${a}m`}</b>AVG</span>
                      </div>
                      <Spark values={cells.map((x) => x?.avg ?? 0)} now={hour} />
                      <span className="pz-plat-best mono">{best != null ? `QUIETEST ${day === 'today' ? 'LATER' : 'SAT'} · ${hLabel(best)}` : 'CLOSED FOR THE DAY'}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <p className="pz-foot mono">ALL FIGURES ARE SKIPLY ESTIMATES FROM VENUE TYPE, HOUR, DAY AND OPENING HOURS · <Link to="/about#estimates" className="link-u">HOW WE ESTIMATE</Link></p>
      </div>
    </main>
  );
}
