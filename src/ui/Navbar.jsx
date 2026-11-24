import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ticketState } from '../lib/tickets';
import { useNow } from '../lib/hooks';
import BrandMark from './BrandMark';
import CityPicker from './CityPicker';
import CommandPalette from './CommandPalette';

const LINKS = [['/explore', 'Departures'], ['/tickets', 'Tickets'], ['/about', 'Story'], ['/contact', 'Contact']];

function LiveClock() {
  const d = new Date(useNow(1000));
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  return (
    <span className="navclock mono" aria-label={`Local time ${hh}:${mm}`}>
      {hh}<span className="navclock-colon">:</span>{mm}
    </span>
  );
}

export default function Navbar() {
  const { location, tickets, theme, setTheme } = useApp();
  const [picker, setPicker] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pill, setPill] = useState(null);
  const route = useLocation();
  const linksRef = useRef(null);
  const now = useNow(15000);
  const active = tickets.filter((t) => !['done', 'cancelled'].includes(ticketState(t, now).phase)).length;

  useEffect(() => setMenu(false), [route.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    const open = () => setPicker(true);
    const key = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk((v) => !v); } };
    window.addEventListener('skiply:pick-city', open); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('skiply:pick-city', open); window.removeEventListener('keydown', key); };
  }, []);

  // sliding pill under the hovered / active link
  const placePill = useCallback((el) => {
    if (!el || !linksRef.current) { setPill(null); return; }
    const a = el.getBoundingClientRect(), b = linksRef.current.getBoundingClientRect();
    setPill({ left: a.left - b.left, width: a.width });
  }, []);
  const resetPill = useCallback(() => placePill(linksRef.current?.querySelector('a.active')), [placePill]);
  useLayoutEffect(() => { resetPill(); }, [route.pathname, resetPill]);
  useEffect(() => { window.addEventListener('resize', resetPill); return () => window.removeEventListener('resize', resetPill); }, [resetPill]);

  const dark = theme ? theme === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${menu ? 'is-open' : ''}`}>
        <div className="nav-pill">
          <span className="nav-glow" aria-hidden="true" />
          <Link to="/" className="nav-brand" aria-label="Skiply home">
            <BrandMark size={32} />
            <span className="brand-word">SKIPLY</span>
          </Link>

          <button className="nav-station" onClick={() => setPicker(true)} aria-label={`Change station, currently ${location?.name}`}>
            <span className="nav-station-dot" />
            <span className="nav-station-name">{location?.name}</span>
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>

          <nav className="nav-links" aria-label="Main" ref={linksRef} onMouseLeave={resetPill}>
            {pill && <span className="nav-slide" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} aria-hidden="true" />}
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} onMouseEnter={(e) => placePill(e.currentTarget)} onFocus={(e) => placePill(e.currentTarget)}>
                {label}{to === '/tickets' && active > 0 && <span className="badge">{active}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            <button className="nav-search" onClick={() => setCmdk(true)} aria-label="Search">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <span className="nav-search-t">Search</span>
              <kbd>{mac ? '⌘' : 'Ctrl'} K</kbd>
            </button>
            <LiveClock />
            <button className="nav-icon" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to day shift' : 'Switch to night shift'} title={dark ? 'Day shift' : 'Night shift'}>
              <span className={`nav-sun ${dark ? '' : 'is-on'}`}>☀</span><span className={`nav-moon ${dark ? 'is-on' : ''}`}>☾</span>
            </button>
            <Link to="/business-panel" className="nav-biz"><span>For business</span><i aria-hidden="true">→</i></Link>
            <button className="nav-icon nav-burger" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu"><span /><span /></button>
          </div>
        </div>

        <div className="nav-drawer">
          {[['/', 'Home'], ...LINKS, ['/profile', 'Passenger details']].map(([to, label], i) => (
            <NavLink key={to} to={to} end style={{ '--i': i }}>{label}{to === '/tickets' && active > 0 && ` (${active})`}</NavLink>
          ))}
          <button className="nav-drawer-search" onClick={() => { setMenu(false); setCmdk(true); }}>Search venues, cities, pages…</button>
          <Link to="/business-panel" className="nav-drawer-biz">Business dashboard →</Link>
        </div>
      </header>
      <CityPicker open={picker} onClose={() => setPicker(false)} />
      <CommandPalette open={cmdk} onClose={() => setCmdk(false)} />
    </>
  );
}
