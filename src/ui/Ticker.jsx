import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';

export default function Ticker({ places, now }) {
  const items = places.slice(0, 24);
  if (!items.length) return <div className="ticker"><div className="ticker-track"><span className="ticker-item">CONTACTING OPENSTREETMAP · LOADING REAL VENUES NEAR YOU ✦</span></div></div>;
  const row = items.map((p) => {
    const e = estimateAt(p, new Date(now));
    return (
      <Link key={p.id} to={`/place/${p.id}`} state={{ place: p }} className="ticker-item">
        <b style={{ color: CATEGORIES[p.category].color }}>●</b> {p.name.toUpperCase()} <span>{e.status.open === false ? 'CLOSED' : fmtWait(e.wait).toUpperCase()}</span> ✦
      </Link>
    );
  });
  return (
    <div className="ticker" aria-label="Live estimated waits nearby">
      <div className="ticker-track" style={{ '--dur': `${items.length * 4}s` }}>
        <div className="ticker-set">{row}</div>
        <div className="ticker-set" aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}
