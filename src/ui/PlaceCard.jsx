import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';
import { fmtKm } from '../lib/geo';
import Emblem from './Emblem';

export function crowdLevel(e) {
  if (e.status.open === false) return 'closed';
  return e.wait <= 10 ? 'low' : e.wait <= 30 ? 'mid' : 'high';
}

export default function PlaceCard({ place, now, onHover, active }) {
  const cat = CATEGORIES[place.category];
  const est = estimateAt(place, new Date(now));
  const level = crowdLevel(est);
  return (
    <Link
      to={`/place/${place.id}`}
      state={{ place }}
      className={`pcard lvl-${level} ${active ? 'is-active' : ''}`}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="pcard-stub">
        <span className="pcard-plat mono">PLAT.</span>
        <span className="pcard-num">{cat.platform}</span>
        <Emblem category={place.category} size={20} />
      </div>
      <div className="pcard-body">
        <div className="pcard-top">
          <span className="kicker">{cat.singular}{place.speciality ? ` · ${place.speciality.split(';')[0].replace(/_/g, ' ')}` : ''}</span>
          {place.distance != null && <span className="kicker">{fmtKm(place.distance)}</span>}
        </div>
        <h3 className="pcard-name">{place.name}</h3>
        <p className="pcard-addr">{place.address || 'Street address not yet mapped'}</p>
        <div className="pcard-foot">
          <span className="pcard-status">
            <span className={`dot ${est.status.open === false ? 'dot-stop' : 'dot-go'}`} />
            {est.status.open === false ? est.status.label : est.hoursSource === 'osm' ? est.status.label : 'Typically open'}
          </span>
          <span className="pcard-wait">
            {est.status.open === false ? <span className="muted">—</span> : <><b>{fmtWait(est.wait)}</b><span className="muted"> · {est.people} waiting</span></>}
          </span>
        </div>
      </div>
      <div className="pcard-meter" aria-hidden="true"><span style={{ height: `${Math.min(100, est.wait * 1.6)}%` }} /></div>
    </Link>
  );
}

export function PlaceCardSkeleton() {
  return (
    <div className="pcard pcard-skel">
      <div className="pcard-stub"><span className="skeleton" style={{ width: 22, height: 30 }} /></div>
      <div className="pcard-body">
        <span className="skeleton" style={{ width: '40%', height: 10 }} />
        <span className="skeleton" style={{ width: '80%', height: 22, marginTop: 10 }} />
        <span className="skeleton" style={{ width: '60%', height: 12, marginTop: 10 }} />
      </div>
    </div>
  );
}
