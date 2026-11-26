import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNow, useReveal } from '../lib/hooks';
import { CATEGORIES } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';
import { distanceKm, fmtKm } from '../lib/geo';
import Emblem from '../ui/Emblem';
import SplitFlap from '../ui/SplitFlap';
import { toast } from '../lib/fx';
import '../styles/mine.css';

export default function Saved() {
  const { favorites, toggleFavorite, toggleCompare, inCompare, location } = useApp();
  const now = useNow(30000);
  useReveal();

  const rows = useMemo(() => {
    const d = new Date(now);
    return favorites.map((p) => ({ p, e: estimateAt(p, d), dist: distanceKm(location, p) }))
      .sort((a, b) => (a.e.status.open === false) - (b.e.status.open === false) || a.e.wait - b.e.wait);
  }, [favorites, now, location]);
  const best = rows.find((r) => r.e.status.open !== false);

  if (!favorites.length) {
    return (
      <main className="saved wrap">
        <div className="saved-empty">
          <div className="saved-heart" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>
          </div>
          <p className="kicker">Saved stations</p>
          <h1 className="h1">Your regulars, <em>one glance away.</em></h1>
          <p className="lede">Tap ♥ on any venue (your bank branch, the family clinic, the salon you trust) and it lands here with a live wait, so you can check all of them before you leave home.</p>
          <Link to="/explore" className="btn btn-ink">Find venues to save →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="saved">
      <div className="wrap">
        <header className="saved-head" data-reveal>
          <div>
            <p className="kicker">Saved stations · {favorites.length} · live from {location.name}</p>
            <h1 className="h1">Your <em>regulars.</em></h1>
          </div>
          {best && (
            <div className="saved-best board">
              <span className="mono saved-best-k"><i className="board-led" /> QUICKEST OF YOURS NOW</span>
              <SplitFlap text={best.p.name} size={16} />
              <SplitFlap text={fmtWait(best.e.wait)} size={9} className="saved-best-w" />
            </div>
          )}
        </header>

        <div className="saved-grid">
          {rows.map(({ p, e, dist }, i) => {
            const cat = CATEGORIES[p.category];
            const closed = e.status.open === false;
            const pct = closed ? 0 : Math.min(100, (e.wait / 60) * 100);
            return (
              <article key={p.id} className={`sv ${closed ? 'is-closed' : ''}`} style={{ '--c': cat.color, '--cn': cat.neon, transitionDelay: `${i * 50}ms` }} data-reveal>
                <div className="sv-top">
                  <span className="sv-ico"><Emblem category={p.category} size={20} /></span>
                  <span className="kicker">{cat.singular} · {fmtKm(dist)}</span>
                  <button className="sv-x" aria-label={`Remove ${p.name}`} onClick={() => { toggleFavorite(p); toast({ title: 'Removed from saved', body: p.name, ttl: 4000, action: { label: 'Undo', onClick: () => toggleFavorite(p) } }); }}>♥</button>
                </div>
                <Link to={`/place/${p.id}`} state={{ place: { ...p, distance: dist } }} className="sv-name">{p.name}</Link>
                <p className="sv-addr muted">{p.address || 'Address not mapped'}</p>
                <div className="sv-gauge" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
                <div className="sv-foot">
                  <span className="sv-wait">{closed ? <span className="muted">{e.status.label}</span> : <><b className="display">{fmtWait(e.wait)}</b><span className="muted"> · {e.people} waiting</span></>}</span>
                  <button className={`chip ${inCompare(p.id) ? 'is-on' : ''}`} onClick={() => toggleCompare(p)}>⇄ {inCompare(p.id) ? 'Comparing' : 'Compare'}</button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="saved-cta" data-reveal>
          <p className="h3">Need to visit a few of these today?</p>
          <div className="saved-cta-row">
            <Link to="/errands" className="btn btn-ink">Plan an Errand Run →</Link>
            <Link to="/compare" className="btn btn-line">Compare side by side</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
