import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNearby, useNow } from '../lib/hooks';
import { CATEGORY_LIST, CATEGORIES } from '../data/categories';
import { estimateAt } from '../lib/estimate';
import { searchVenues } from '../services/places';
import PlaceCard, { PlaceCardSkeleton } from '../ui/PlaceCard';
import PlaceMap from '../ui/PlaceMap';
import Emblem from '../ui/Emblem';

const PAGE = 24;

export default function Explore() {
  const { location } = useApp();
  const { places, loading, error } = useNearby(location);
  const now = useNow(30000);
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || '';
  const q = params.get('q') || '';
  const [openOnly, setOpenOnly] = useState(true);
  const [sort, setSort] = useState('distance');
  const [hover, setHover] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const [remote, setRemote] = useState({ q: '', list: null, loading: false });
  const [showMap, setShowMap] = useState(false);

  const set = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); setLimit(PAGE); };

  const base = useMemo(() => (remote.list && remote.q === q ? mergeUnique(remote.list, places) : places), [remote, q, places]);
  const list = useMemo(() => {
    const d = new Date(now), s = q.trim().toLowerCase();
    return base
      .map((p) => ({ p, e: estimateAt(p, d) }))
      .filter(({ p, e }) => (!cat || p.category === cat)
        && (!openOnly || e.status.open !== false)
        && (!s || [p.name, p.localName, p.address, p.operator, p.speciality, CATEGORIES[p.category].label].filter(Boolean).join(' ').toLowerCase().includes(s)))
      .sort((a, b) => (sort === 'wait' ? a.e.wait - b.e.wait : 0) || a.p.distance - b.p.distance)
      .map((x) => x.p);
  }, [base, cat, openOnly, q, sort, now]);

  const searchOSM = async () => {
    setRemote({ q, list: null, loading: true });
    try { setRemote({ q, list: await searchVenues(q, location), loading: false }); } catch (e) { setRemote({ q, list: [], loading: false }); }
  };

  const navigate = useNavigate();
  const mapPlaces = useMemo(() => list.slice(0, 200), [list]);
  const openPlace = useCallback((p) => navigate(`/place/${p.id}`, { state: { place: p } }), [navigate]);
  const you = useMemo(() => (location.source === 'gps' ? location : null), [location]);
  const shown = list.slice(0, limit);
  return (
    <main className="explore">
      <div className="wrap">
        <header className="explore-head">
          <div>
            <p className="kicker">Departures · within 3 km of {location.name}</p>
            <h1 className="h1">{cat ? CATEGORIES[cat].label : 'Every queue'} <em className="muted">near you</em></h1>
          </div>
          <div className="explore-search">
            <input className="input" value={q} placeholder="Filter by name, area, speciality…" onChange={(e) => set('q', e.target.value)} aria-label="Filter venues" />
          </div>
        </header>

        <div className="filters" role="toolbar" aria-label="Filters">
          <button className="chip" aria-pressed={!cat} onClick={() => set('cat', '')}>All platforms</button>
          {CATEGORY_LIST.map((c) => (
            <button key={c.key} className="chip" aria-pressed={cat === c.key} onClick={() => set('cat', cat === c.key ? '' : c.key)}>
              <Emblem category={c.key} size={15} /> {c.label}
            </button>
          ))}
          <span className="filters-sp" />
          <button className="chip" aria-pressed={openOnly} onClick={() => setOpenOnly((o) => !o)}><span className="dot dot-go" /> Open now</button>
          <select className="chip select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="distance">Nearest first</option>
            <option value="wait">Shortest wait</option>
          </select>
          <button className="chip map-toggle" onClick={() => setShowMap((m) => !m)}>{showMap ? 'List' : 'Map'}</button>
        </div>

        <div className={`explore-grid ${showMap ? 'show-map' : ''}`}>
          <section className="explore-list" aria-live="polite">
            <p className="mono explore-count">
              {loading && !places.length ? 'CONTACTING OPENSTREETMAP…' : `${list.length} VENUE${list.length === 1 ? '' : 'S'} · SORTED BY ${sort === 'wait' ? 'ESTIMATED WAIT' : 'DISTANCE'}`}
              {loading && places.length > 0 && ' · STILL LOADING'}
            </p>
            <div className="cards cards-list">
              {loading && !places.length && Array.from({ length: 6 }, (_, i) => <PlaceCardSkeleton key={i} />)}
              {shown.map((p) => <PlaceCard key={p.id} place={p} now={now} onHover={setHover} active={hover === p.id} />)}
            </div>
            {list.length > limit && <button className="btn btn-line more" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, list.length - limit)} more</button>}

            {!loading && (q.trim().length > 2) && remote.q !== q && (
              <div className="notice">
                Can't find it? Search all of OpenStreetMap for “{q}” around {location.name}.
                <button className="btn btn-ink btn-sm" onClick={searchOSM}>Search OSM</button>
              </div>
            )}
            {remote.loading && <p className="mono explore-count">SEARCHING OPENSTREETMAP…</p>}
            {!loading && !list.length && !remote.loading && (
              <div className="empty">
                <p className="display empty-t">Wrong platform?</p>
                <p className="muted">{error ? `OpenStreetMap is not responding (${error}).` : 'No venue matches these filters.'} Try clearing a filter, turning off “Open now” or changing the station.</p>
              </div>
            )}
          </section>
          <aside className="explore-map">
            <PlaceMap center={location} places={mapPlaces} activeId={hover} you={you} onSelect={openPlace} zoom={14} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function mergeUnique(a, b) {
  const seen = new Set(a.map((p) => p.id));
  return [...a, ...b.filter((p) => !seen.has(p.id))];
}
