import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { estimateAt } from '../lib/estimate';
import { hash01 } from '../lib/geo';
import SplitFlap from './SplitFlap';
import { DigitalClock } from './Clock';

const ROWS = 6;
const narrowQuery = '(max-width: 720px)';
function useNarrow() {
  const [n, setN] = useState(() => window.matchMedia?.(narrowQuery).matches);
  useEffect(() => {
    const m = window.matchMedia?.(narrowQuery); if (!m) return undefined;
    const on = () => setN(m.matches); m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return n;
}

/** The departures board: real nearby venues, cycling every few seconds. */
export default function Board({ places, loading, cityName, now }) {
  const [page, setPage] = useState(0);
  const narrow = useNarrow();
  const V = narrow ? 13 : 22, T = narrow ? 3 : 5;
  const pool = useMemo(() => places.slice(0, 48), [places]);
  const pages = Math.max(1, Math.ceil(pool.length / ROWS));
  useEffect(() => { setPage(0); }, [pool]);
  useEffect(() => {
    if (pages < 2) return undefined;
    const id = setInterval(() => setPage((p) => (p + 1) % pages), 7000);
    return () => clearInterval(id);
  }, [pages]);

  const rows = pool.slice(page * ROWS, page * ROWS + ROWS);
  return (
    <div className="board" aria-label={`Live board for ${cityName}`}>
      <div className="board-head">
        <span className="board-title"><span className="board-led" /> DEPARTURES FROM YOUR QUEUE</span>
        <span className="board-meta mono">{cityName?.toUpperCase()} · <DigitalClock /></span>
      </div>
      <div className="board-cols mono">
        <span>TOKEN</span><span>VENUE</span><span className="hide-sm">PLAT</span><span>WAIT</span><span className="hide-sm">STATUS</span>
      </div>
      <div className="board-rows">
        {Array.from({ length: ROWS }, (_, i) => {
          const p = rows[i];
          if (!p) {
            return (
              <div className="board-row" key={i}>
                <SplitFlap text={loading && i === 0 ? '···' : ''} size={T} />
                <SplitFlap text={loading && i === 0 ? 'FETCHING OSM' : ''} size={V} className="board-venue" />
                <SplitFlap text="" size={2} className="hide-sm" />
                <SplitFlap text="" size={narrow ? 4 : 5} />
                <SplitFlap text="" size={8} className="hide-sm" />
              </div>
            );
          }
          const cat = CATEGORIES[p.category];
          const e = estimateAt(p, new Date(now));
          const closed = e.status.open === false;
          const tok = `${cat.letter}${String(10 + Math.floor(hash01(p.id) * 89)).padStart(2, '0')}`;
          const status = closed ? 'CLOSED' : e.wait <= 10 ? 'WALK IN' : e.wait <= 30 ? 'BOARDING' : 'BUSY';
          return (
            <Link to={`/place/${p.id}`} state={{ place: p }} className={`board-row is-link st-${status.replace(' ', '').toLowerCase()}`} key={i}>
              <SplitFlap text={tok} size={T} />
              <SplitFlap text={p.name} size={V} className="board-venue" />
              <SplitFlap text={String(cat.platform)} size={2} className="hide-sm" />
              <SplitFlap text={closed ? '--' : `${e.wait}M`} size={narrow ? 4 : 5} align="right" />
              <SplitFlap text={status} size={8} className="hide-sm board-status" />
            </Link>
          );
        })}
      </div>
      <div className="board-foot mono">
        <span>{pool.length ? `PAGE ${page + 1}/${pages} · ${places.length} REAL VENUES WITHIN 3 KM` : loading ? 'CONTACTING OPENSTREETMAP…' : 'NO VENUES FOUND NEARBY'}</span>
        <span className="hide-sm">WAIT = SKIPLY ESTIMATE · TAP A ROW TO BOOK</span>
      </div>
    </div>
  );
}
