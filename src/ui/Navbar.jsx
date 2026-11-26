import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ticketState } from '../lib/tickets';
import { useNearby, useNow } from '../lib/hooks';
import { estimateAt, fmtWait } from '../lib/estimate';
import { photo } from '../data/photos';
import BrandMark from './BrandMark';
import CityPicker from './CityPicker';
import CommandPalette from './CommandPalette';
import Livery from './fx/Livery';
import { runTrain } from './fx/Shortcuts';
import '../styles/simple.css';
import '../styles/navbar.css';

const LINKS = [['/explore', 'Find a queue'], ['/errands', 'Plan my day'], ['/tickets', 'My tickets']];

const ICONS = {
  pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  compare: <><path d="M7 4v16M17 4v16" /><path d="M3 8h8M13 16h8" /></>,
  saved: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />,
  passport: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 16h6" /></>,
  about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
};
const MORE = [
  ['/pulse', 'City Pulse', 'Every line in your city, hour by hour', 'pulse'],
  ['/compare', 'Compare', 'Put up to 3 places side by side', 'compare'],
  ['/saved', 'Saved places', 'Your regular bank, clinic, salon', 'saved'],
  ['/profile', 'Passport', 'Badges, stamps and time saved', 'passport'],
  ['/about', 'How it works', 'Where our wait times come from', 'about'],
  ['/contact', 'Contact', 'Suggest a place or report a bug', 'contact'],
];
const MORE_PATHS = MORE.map(([to]) => to);

const Chevron = () => <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
const Ico = ({ k }) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[k]}</svg>;

/** Label whose letters roll up on hover. */
const Roll = ({ children }) => <span className="roll" data-t={children}><span>{children}</span></span>;

/** Tiny progress ring for the live ticket chip. */
function Ring({ k }) {
  const c = 2 * Math.PI * 7;
  return (
    <svg className="tk-ring" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" />
      <circle cx="9" cy="9" r="7" className="tk-ring-v" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.04, Math.min(1, k)))} />
    </svg>
  );
}

export default function Navbar() {
  const { location, tickets, favorites } = useApp();
  const taps = useRef([]);
  const [picker, setPicker] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pill, setPill] = useState(null);
  const [tick, setTick] = useState(0);
  const route = useLocation();
  const linksRef = useRef(null);
  const moreRef = useRef(null);
  const barRef = useRef(null);
  const now = useNow(15000);
  const { places } = useNearby(location);

  // ---- live data ----
  const live = tickets.map((t) => ({ t, s: ticketState(t, now) })).filter((x) => !['done', 'cancelled'].includes(x.s.phase));
  const urgent = [...live].sort((a, b) => (a.s.eta || Infinity) - (b.s.eta || Infinity))[0];
  const shortest = useMemo(() => {
    const d = new Date(now);
    return places.filter((p) => p.distance < 3).map((p) => ({ p, e: estimateAt(p, d) }))
      .filter((x) => x.e.status.open !== false).sort((a, b) => a.e.wait - b.e.wait).slice(0, 5);
  }, [places, now]);
  useEffect(() => {
    if (shortest.length < 2) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 4200);
    return () => clearInterval(id);
  }, [shortest.length]);
  const cur = shortest.length ? shortest[tick % shortest.length] : null;

  useEffect(() => { setMenu(false); setMore(false); }, [route.pathname]);
  useEffect(() => {
    let raf;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        const h = document.documentElement.scrollHeight - window.innerHeight;
        barRef.current?.style.setProperty('--k', h > 0 ? Math.min(1, window.scrollY / h) : 0);
      });
    };
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [route.pathname]);
  useEffect(() => {
    const open = () => setPicker(true);
    const palette = () => setCmdk(true);
    const key = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk((v) => !v); } };
    window.addEventListener('skiply:cmdk', palette);
    window.addEventListener('skiply:pick-city', open);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('skiply:cmdk', palette); window.removeEventListener('skiply:pick-city', open); window.removeEventListener('keydown', key); };
  }, []);
  useEffect(() => {
    if (!more) return undefined;
    const out = (e) => { if (!moreRef.current?.contains(e.target)) setMore(false); };
    const esc = (e) => e.key === 'Escape' && setMore(false);
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc); };
  }, [more]);

  // sliding highlight under the hovered / active link
  const placePill = useCallback((el) => {
    if (!el || !linksRef.current) { setPill(null); return; }
    const a = el.getBoundingClientRect(), b = linksRef.current.getBoundingClientRect();
    setPill({ left: a.left - b.left, width: a.width });
  }, []);
  const resetPill = useCallback(() => placePill(linksRef.current?.querySelector('a.active, .snav-more-btn.active')), [placePill]);
  useLayoutEffect(() => { resetPill(); }, [route.pathname, resetPill, urgent?.t.id]);
  useEffect(() => { window.addEventListener('resize', resetPill); return () => window.removeEventListener('resize', resetPill); }, [resetPill]);

  // five quick taps on the logo send a train through
  const brandTap = () => {
    const t = Date.now();
    taps.current = [...taps.current.filter((x) => t - x < 1600), t];
    if (taps.current.length >= 5) { taps.current = []; runTrain(); }
  };
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const count = (to) => (to === '/saved' && favorites.length ? favorites.length : null);
  const moreActive = MORE_PATHS.includes(route.pathname);

  const ticketChip = urgent && (
    <span className={`tkchip ph-${urgent.s.phase}`}>
      <Ring k={urgent.t.mode === 'live' ? urgent.s.progress ?? 0 : 0.15} />
      <b className="mono">{urgent.t.token}</b>
      <span className="tkchip-s">
        {urgent.s.phase === 'now' ? 'Your turn' : urgent.s.phase === 'scheduled' ? 'Booked' : `${urgent.s.ahead} ahead`}
      </span>
      {live.length > 1 && <span className="tkchip-n">+{live.length - 1}</span>}
    </span>
  );

  return (
    <>
      <header className={`nav snav xnav ${scrolled ? 'is-scrolled' : ''} ${menu ? 'is-open' : ''}`}>
        <div className="nav-pill" ref={barRef}>
          <Link to="/" className="nav-brand" aria-label="Skiply home" onClick={brandTap}>
            <BrandMark size={32} />
            <span className="brand-word">Skiply</span>
          </Link>

          <button className="nav-station xcity" onClick={() => setPicker(true)} aria-label={`Change city, currently ${location?.name}`}>
            <span className="xcity-top">
              <span className="xcity-dot" aria-hidden="true" />
              <span className="nav-station-name">{location?.name}</span>
              <Chevron />
            </span>
            <span className="xcity-live" aria-live="off">
              {cur ? (
                <span key={cur.p.id} className="xcity-flip">
                  <b className="mono">{fmtWait(cur.e.wait)}</b> · {cur.p.name}
                </span>
              ) : <span className="xcity-flip">Finding short lines…</span>}
            </span>
          </button>

          <nav className="nav-links" aria-label="Main" ref={linksRef} onMouseLeave={resetPill}>
            {pill && <span className="nav-slide" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} aria-hidden="true" />}
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} className={to === '/tickets' && urgent ? 'has-chip' : ''}
                onMouseEnter={(e) => placePill(e.currentTarget)} onFocus={(e) => placePill(e.currentTarget)}
                aria-label={to === '/tickets' && urgent ? `My tickets, token ${urgent.t.token}` : undefined}>
                {to === '/tickets' && urgent ? ticketChip : <Roll>{label}</Roll>}
              </NavLink>
            ))}
            <div className="snav-more" ref={moreRef}>
              <button className={`snav-more-btn ${moreActive ? 'active' : ''}`} aria-expanded={more} aria-haspopup="true"
                onClick={() => setMore((m) => !m)} onMouseEnter={(e) => placePill(e.currentTarget)} onFocus={(e) => placePill(e.currentTarget)}>
                <Roll>More</Roll> <Chevron />
              </button>
              {more && (
                <div className="snav-menu xmega" role="menu">
                  <div className="xmega-list">
                    {MORE.map(([to, label, hint, ico], i) => (
                      <NavLink key={to} to={to} role="menuitem" className="snav-item xmega-i" style={{ '--i': i }}>
                        <span className="xmega-ico"><Ico k={ico} /></span>
                        <span className="xmega-t">
                          <b>{label}{count(to) && <span className="snav-count">{count(to)}</span>}</b>
                          <span>{hint}</span>
                        </span>
                      </NavLink>
                    ))}
                  </div>
                  <Link to="/errands" className="xmega-card" role="menuitem">
                    <img src={photo('street', 480)} alt="" loading="lazy" />
                    <span className="xmega-card-t">
                      <span className="mono">NEW</span>
                      <b>Plan my day</b>
                      <span>Five errands, one route, the least standing. →</span>
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          <div className="nav-actions">
            <button className="nav-search" onClick={() => setCmdk(true)} aria-label="Search">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <kbd>{mac ? '⌘' : 'Ctrl'} K</kbd>
            </button>
            <Livery />
            <Link to="/business-panel" className="nav-biz"><Roll>For business</Roll><i aria-hidden="true">→</i></Link>
            <button className="nav-icon nav-burger" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu"><span /><span /></button>
          </div>
          <span className="xnav-progress" aria-hidden="true" />
        </div>

        <div className="nav-drawer snav-drawer">
          {urgent && <Link to="/tickets" className="xdrawer-ticket">{ticketChip}<span>View ticket →</span></Link>}
          <div className="snav-dgroup">
            {[['/', 'Home'], ...LINKS].map(([to, label], i) => (
              <NavLink key={to} to={to} end className="snav-drow" style={{ '--i': i }}>
                {label}{to === '/tickets' && live.length > 0 && <span className="badge">{live.length}</span>}
              </NavLink>
            ))}
          </div>
          <p className="snav-dlabel mono">More</p>
          <div className="snav-dgrid">
            {MORE.map(([to, label, , ico]) => (
              <NavLink key={to} to={to} className="snav-dchip"><span className="xd-ico"><Ico k={ico} /></span>{label}{count(to) && <span className="snav-count">{count(to)}</span>}</NavLink>
            ))}
          </div>
          <button className="nav-drawer-search" onClick={() => { setMenu(false); setCmdk(true); }}>Search places, cities, pages…</button>
          <Link to="/business-panel" className="nav-drawer-biz">For business →</Link>
        </div>
      </header>
      <CityPicker open={picker} onClose={() => setPicker(false)} />
      <CommandPalette open={cmdk} onClose={() => setCmdk(false)} />
    </>
  );
}
