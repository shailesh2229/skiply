import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNearby } from '../lib/hooks';
import { CITIES } from '../data/cities';
import { CATEGORIES } from '../data/categories';
import { fmtKm } from '../lib/geo';
import Emblem from './Emblem';
import { PALETTE_LIST } from '../data/palettes';
import { revealTransition } from '../lib/fx';

const PAGES = [
  ['Departures: every queue near you', '/explore'], ['City Pulse: the control room', '/pulse'], ['Errand Run: plan several stops', '/errands'],
  ['My tickets', '/tickets'], ['Saved stations', '/saved'], ['Compare venues', '/compare'], ['Passenger passport', '/profile'],
  ['Business dashboard', '/business-panel'], ['How estimates work', '/about#estimates'], ['The story', '/about'], ['Write to us', '/contact'],
];

/** ⌘K palette over real nearby venues, Indian cities and pages. */
export default function CommandPalette({ open, onClose }) {
  const { location, setLocation, setPalette } = useApp();
  const { places } = useNearby(open ? location : null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const venues = places.filter((p) => !s || p.name.toLowerCase().includes(s) || CATEGORIES[p.category].label.toLowerCase().includes(s)).slice(0, s ? 7 : 5)
      .map((p) => ({ type: 'venue', p, label: p.name, sub: `${CATEGORIES[p.category].singular} · ${fmtKm(p.distance)}`, go: () => navigate(`/place/${p.id}`, { state: { place: p } }) }));
    const cities = (s ? CITIES.filter((c) => c.name.toLowerCase().startsWith(s)) : []).slice(0, 4)
      .map((c) => ({ type: 'city', label: `Switch station to ${c.name}`, sub: c.state, go: () => { setLocation({ ...c, source: 'city' }); navigate('/'); } }));
    const pages = PAGES.filter(([l]) => !s || l.toLowerCase().includes(s)).slice(0, s ? 4 : 7)
      .map(([l, to]) => ({ type: 'page', label: l, sub: to, go: () => navigate(to) }));
    const liveries = (s.length > 1 ? PALETTE_LIST.filter((p) => `livery theme ${p.label} ${p.tagline}`.toLowerCase().includes(s)) : []).slice(0, 4)
      .map((p) => ({ type: 'livery', label: `Livery: ${p.label}`, sub: p.tagline, go: () => revealTransition(() => setPalette(p.key)) }));
    return [...venues, ...cities, ...pages, ...liveries];
  }, [q, places, navigate, setLocation, setPalette]);

  useEffect(() => setSel(0), [q]);
  if (!open) return null;

  const key = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((n) => Math.min(results.length - 1, n + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((n) => Math.max(0, n - 1)); }
    else if (e.key === 'Enter' && results[sel]) { results[sel].go(); onClose(); }
  };

  let lastType = null;
  return (
    <div className="cmdk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search Skiply">
        <div className="cmdk-in">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder={`Search venues near ${location.name}, cities, pages…`} aria-label="Search" />
          <kbd>ESC</kbd>
        </div>
        <div className="cmdk-list" role="listbox">
          {results.map((r, i) => {
            const head = r.type !== lastType ? { venue: `Near ${location.name}`, city: 'Stations', page: 'Go to', livery: 'Liveries' }[r.type] : null;
            lastType = r.type;
            return (
              <React.Fragment key={i}>
                {head && <p className="cmdk-head mono">{head}</p>}
                <button role="option" aria-selected={i === sel} className="cmdk-item" onMouseEnter={() => setSel(i)} onClick={() => { r.go(); onClose(); }}>
                  <span className="cmdk-ico" style={r.p ? { color: CATEGORIES[r.p.category].neon } : undefined}>
                    {r.p ? <Emblem category={r.p.category} size={16} /> : r.type === 'city' ? '◎' : r.type === 'livery' ? '◐' : '→'}
                  </span>
                  <span className="cmdk-t"><b>{r.label}</b><span>{r.sub}</span></span>
                  <span className="cmdk-enter mono">↵</span>
                </button>
              </React.Fragment>
            );
          })}
          {!results.length && <p className="cmdk-empty">Nothing found for “{q}”.</p>}
        </div>
        <div className="cmdk-foot mono"><span>↑↓ MOVE</span><span>↵ OPEN</span><span>REAL VENUES · OPENSTREETMAP</span></div>
      </div>
    </div>
  );
}
