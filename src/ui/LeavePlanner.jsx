import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';
import { fmtKm } from '../lib/geo';
import Emblem from './Emblem';

const STEP = 15, SPAN = 12 * 60, FIGS = 24;
const t = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function Figure({ on, i }) {
  return (
    <svg className={`fig ${on ? 'is-on' : ''}`} style={{ '--i': i }} viewBox="0 0 12 28" aria-hidden="true">
      <circle cx="6" cy="4" r="3.2" />
      <path d="M2 10.5a4 4 0 0 1 8 0V18H8.6v9H3.4v-9H2z" />
    </svg>
  );
}

/** Interactive "when should I leave?" planner over real nearby venues. */
export default function LeavePlanner({ places, now }) {
  const options = useMemo(() => CATEGORY_LIST.map((c) => places.find((p) => p.category === c.key)).filter(Boolean), [places]);
  const [sel, setSel] = useState(null);
  const [offset, setOffset] = useState(0);
  const place = options.find((p) => p.id === sel) || options[0];
  const base = useMemo(() => { const d = new Date(now); d.setSeconds(0, 0); d.setMinutes(Math.ceil(d.getMinutes() / STEP) * STEP); return d.getTime(); }, [Math.floor(now / 900000)]); // eslint-disable-line react-hooks/exhaustive-deps

  const series = useMemo(() => {
    if (!place) return [];
    return Array.from({ length: SPAN / STEP + 1 }, (_, k) => ({ k, ...estimateAt(place, new Date(base + k * STEP * 60000)) }));
  }, [place, base]);

  if (!place) {
    return <div className="planner planner-empty"><p className="mono">LOADING REAL VENUES…</p></div>;
  }
  const cur = series[offset / STEP];
  const open = series.filter((s) => s.status.open !== false);
  const best = open.reduce((b, s) => (!b || s.wait < b.wait ? s : b), null);
  const travel = Math.max(5, Math.round((place.distance / 18) * 60) + 4);
  const arrive = new Date(base + offset * 60000);
  const max = Math.max(10, ...series.map((s) => s.wait));
  const cat = CATEGORIES[place.category];

  return (
    <div className="planner" style={{ '--cat': cat.color }}>
      <div className="planner-picks" role="tablist" aria-label="Choose a venue">
        {options.map((p) => (
          <button key={p.id} role="tab" aria-selected={p.id === place.id} className="pp" style={{ '--c': CATEGORIES[p.category].color }} onClick={() => setSel(p.id)}>
            <Emblem category={p.category} size={16} />
            <span className="pp-t"><b>{CATEGORIES[p.category].singular}</b><span>{p.name}</span></span>
          </button>
        ))}
      </div>

      <div className="planner-stage">
        <div className="planner-read">
          <p className="kicker">If you arrive at</p>
          <p className="planner-time display">{t(arrive)}</p>
          <p className="planner-venue"><Link to={`/place/${place.id}`} state={{ place }} className="link-u">{place.name}</Link> <span className="muted">· {fmtKm(place.distance)} away</span></p>
          <div className="planner-wait">
            <span className="display planner-wait-n">{cur.status.open === false ? 'Closed' : fmtWait(cur.wait)}</span>
            <span className="muted">{cur.status.open === false ? cur.status.label : `≈ ${cur.people} ${cur.people === 1 ? 'person' : 'people'} ahead of you`}</span>
          </div>
        </div>

        <div className="planner-queue" aria-label={`${cur.people} people in line`}>
          <span className="pq-door mono">COUNTER</span>
          <div className="pq-figs">
            {Array.from({ length: FIGS }, (_, i) => <Figure key={i} i={i} on={cur.status.open !== false && i < cur.people} />)}
          </div>
          {cur.people > FIGS && <span className="pq-more mono">+{cur.people - FIGS}</span>}
        </div>

        <div className="planner-chart" aria-hidden="true">
          {series.map((s) => (
            <span key={s.k} className={`pc-b ${s.k * STEP === offset ? 'is-cur' : ''} ${best && s.k === best.k ? 'is-best' : ''} ${s.status.open === false ? 'is-x' : ''}`}
              style={{ height: s.status.open === false ? '4%' : `${Math.max(6, (s.wait / max) * 100)}%` }} onClick={() => setOffset(s.k * STEP)} />
          ))}
        </div>
        <input className="planner-range" type="range" min="0" max={SPAN} step={STEP} value={offset}
          onChange={(e) => setOffset(+e.target.value)} aria-label="Arrival time" aria-valuetext={t(arrive)} />
        <div className="planner-scale mono"><span>NOW</span><span>+3H</span><span>+6H</span><span>+9H</span><span>+12H</span></div>

        {best && (
          <div className="planner-tip">
            <span className="mono">SKIPLY SUGGESTS</span>
            <p>
              Leave home at <b>{t(new Date(base + best.k * STEP * 60000 - travel * 60000))}</b> to reach by {t(new Date(base + best.k * STEP * 60000))}
              {best.wait === 0 ? ' and walk straight in.' : `, when the wait is about ${fmtWait(best.wait)}.`}
              <span className="muted"> (≈{travel} min travel)</span>
            </p>
            <button className="btn btn-ink btn-sm" onClick={() => setOffset(best.k * STEP)}>Show me</button>
          </div>
        )}
      </div>
    </div>
  );
}
