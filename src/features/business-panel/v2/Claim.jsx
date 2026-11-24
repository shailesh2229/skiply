import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useNearby } from '../../../lib/hooks';
import { searchVenues } from '../../../services/places';
import { CATEGORIES } from '../../../data/categories';
import { fmtKm } from '../../../lib/geo';
import Emblem from '../../../ui/Emblem';

export default function Claim({ onClaim }) {
  const { location } = useApp();
  const { places, loading } = useNearby(location);
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const s = q.trim().toLowerCase();
  const list = found || places.filter((p) => !s || p.name.toLowerCase().includes(s)).slice(0, 24);

  const search = async (e) => {
    e.preventDefault();
    if (s.length < 3) return;
    setBusy(true);
    try { setFound(await searchVenues(q.trim(), location)); } catch (err) { setFound([]); } finally { setBusy(false); }
  };

  return (
    <div className="claim">
      <div className="claim-hero">
        <span className="ov-kicker">Skiply for business</span>
        <h1 className="ov-title">Claim your <span>counter.</span></h1>
        <p>Pick your venue from OpenStreetMap near {location.name}. Your dashboard starts running on Skiply's queue model straight away, and the tokens customers book in the app land here.</p>
        <form className="claim-search" onSubmit={search}>
          <input value={q} onChange={(e) => { setQ(e.target.value); setFound(null); }} placeholder="Your venue's name, e.g. Lilavati Hospital" aria-label="Venue name" />
          <button className="call-btn" disabled={busy || s.length < 3}>{busy ? 'Searching…' : 'Search OSM'}</button>
        </form>
      </div>
      <div className="claim-grid">
        {loading && !places.length && Array.from({ length: 8 }, (_, i) => <div key={i} className="tile claim-card skel" />)}
        {list.map((p) => (
          <button key={p.id} className="tile claim-card" onClick={() => onClaim(p)} style={{ '--c': CATEGORIES[p.category].neon }}>
            <span className="claim-ico"><Emblem category={p.category} size={18} /></span>
            <b>{p.name}</b>
            <span>{CATEGORIES[p.category].singular}{p.distance != null ? ` · ${fmtKm(p.distance)}` : ''}</span>
            <em>Claim →</em>
          </button>
        ))}
        {!loading && !list.length && <p className="muted-s">No venues match. Try Search OSM.</p>}
      </div>
    </div>
  );
}
