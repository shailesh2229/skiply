import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';
import { fmtKm } from '../lib/geo';
import { useApp } from '../context/AppContext';
import { toast, chime } from '../lib/fx';
import Emblem from './Emblem';
import VenuePhoto from './VenuePhoto';
import '../styles/tickets2.css';

export function crowdLevel(e) {
  if (e.status.open === false) return 'closed';
  return e.wait <= 10 ? 'low' : e.wait <= 30 ? 'mid' : 'high';
}

export const HeartIcon = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />
  </svg>
);
export const CompareIcon = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4 3 8l4 4M3 8h13M17 12l4 4-4 4M21 16H8" />
  </svg>
);

/** Save + compare toggles that work from any card or page. */
export function usePlaceActions(place) {
  const { isFavorite, toggleFavorite, inCompare, toggleCompare, compare } = useApp();
  const fav = isFavorite(place.id), cmp = inCompare(place.id);
  const onFav = () => {
    toggleFavorite(place); chime('ping');
    toast({ title: fav ? 'Removed from saved' : 'Saved to your stations', body: place.name, tone: fav ? 'info' : 'go', ttl: 3000 });
  };
  const onCmp = () => {
    toggleCompare(place); chime('ping');
    if (cmp) toast({ title: 'Removed from compare', body: place.name, ttl: 2500 });
    else toast({ title: compare.length >= 3 ? 'Compare is full, oldest swapped out' : `Added to compare (${Math.min(3, compare.length + 1)}/3)`, body: place.name, tone: 'go', action: compare.length >= 1 ? { label: 'Compare', to: '/compare' } : undefined, ttl: 3500 });
  };
  return { fav, cmp, onFav, onCmp };
}

export default function PlaceCard({ place, now, onHover, active }) {
  const cat = CATEGORIES[place.category];
  const est = estimateAt(place, new Date(now));
  const level = crowdLevel(est);
  const { fav, cmp, onFav, onCmp } = usePlaceActions(place);
  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return (
    <div className="pcard-wrap">
      <div className={`pcard-qa ${fav || cmp ? 'has-on' : ''}`}>
        <button className="qa-fav" aria-pressed={fav} onClick={stop(onFav)} aria-label={fav ? `Unsave ${place.name}` : `Save ${place.name}`} title={fav ? 'Saved' : 'Save'}><HeartIcon /></button>
        <button className="qa-cmp" aria-pressed={cmp} onClick={stop(onCmp)} aria-label={cmp ? `Remove ${place.name} from compare` : `Compare ${place.name}`} title="Compare"><CompareIcon /></button>
      </div>
      <Link
        to={`/place/${place.id}`}
        state={{ place }}
        className={`pcard lvl-${level} ${active ? 'is-active' : ''}`}
        onMouseEnter={() => onHover?.(place.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className="pcard-stub pcard-photo">
          <VenuePhoto place={place} width={160} />
          <span className="pcard-ico" style={{ color: cat.color }}><Emblem category={place.category} size={14} /></span>
        </div>
        <div className="pcard-body">
          <div className="pcard-top">
            <span className="kicker">{cat.singular}{place.speciality ? ` · ${place.speciality.split(';')[0].replace(/_/g, ' ')}` : ''}</span>
            {place.distance != null && <span className="kicker pcard-dist">{fmtKm(place.distance)}</span>}
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
    </div>
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
