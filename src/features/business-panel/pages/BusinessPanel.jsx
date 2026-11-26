import React, { useCallback, useState } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Onboarding from '../v2/Onboarding';
import Home from '../v2/Home';
import LiveQueue from '../v2/LiveQueue';
import Display from '../v2/Display';
import { Reports, Settings } from '../v2/Sections';
import { SimProvider, useSim } from '../v2/SimContext';
import BrandMark from '../../../ui/BrandMark';
import { load, save } from '../../../lib/storage';
import '../v2/console.css';
import '../styles/BusinessPanel.css';
import '../v2/legacy.css';
import '../v2/simple.css';
import '../v2/pro.css';

const I = {
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  queue: <><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="7" r="2.5" /><path d="M2.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5M12.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5" /></>,
  tv: <><rect x="2.5" y="4.5" width="19" height="13" rx="2.5" /><path d="M8 21h8M12 17.5V21" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  exit: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
};
const Ico = ({ k, size = 22 }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[k]}</svg>;

const NAV = [
  ['', 'Home', 'home', 'Today at a glance'],
  ['queue', 'Live queue', 'queue', 'Call next, add walk-ins'],
  ['display', 'TV display', 'tv', 'Now Serving screen'],
  ['reports', 'Reports', 'chart', 'Busy hours & feedback'],
  ['settings', 'Settings', 'gear', 'Business, hours, staff'],
];

// Old addresses keep working.
const REDIRECTS = [
  ['analytics', '/business-panel/reports?tab=analytics'], ['feedback', '/business-panel/reports?tab=feedback'],
  ['departments', '/business-panel/settings?tab=counters'], ['schedule', '/business-panel/settings?tab=hours'],
  ['staff', '/business-panel/settings?tab=staff'], ['notifications', '/business-panel/settings?tab=alerts'],
  ['profile', '/business-panel/settings?tab=business'],
];

function Sidebar() {
  const sim = useSim();
  const waiting = sim?.queue.length ?? 0;
  const name = sim?.venue.name || 'Set up your business';
  return (
    <aside className="sb" aria-label="Business navigation">
      <Link to={sim ? '/business-panel/settings?tab=business' : '/business-panel'} className="sb-ws" title={name}>
        <span className="sb-ws-av" aria-hidden="true">{name.trim()[0]?.toUpperCase() || 'S'}</span>
        <span className="sb-ws-t"><b>{name}</b><em>{sim ? <><i className="sb-live" /> Open · {sim.open} {sim.open === 1 ? 'counter' : 'counters'}</> : 'Skiply for business'}</em></span>
        <svg className="sb-ws-chev" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 6l3-3 3 3M5 10l3 3 3-3" /></svg>
      </Link>
      <nav className="sb-nav">
        <p className="sb-label">Workspace</p>
        {NAV.map(([to, label, icon, hint]) => (
          <NavLink key={label} to={`/business-panel${to ? `/${to}` : ''}`} end={!to} className="sb-a" title={hint}>
            <Ico k={icon} size={16} />
            <span className="sb-t"><b>{label}</b><em>{hint}</em></span>
            {to === 'queue' && waiting > 0 && <span className="sb-badge">{waiting}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sb-foot">
        <Link to="/" className="sb-a sb-exit"><Ico k="exit" size={16} /><span className="sb-t"><b>Back to website</b></span></Link>
        <Link to="/" className="sb-brand" aria-label="Skiply website"><BrandMark size={20} /><span>Skiply</span></Link>
      </div>
    </aside>
  );
}

export default function BusinessPanel() {
  const [venue, setVenue] = useState(() => load('skiply.biz', null));
  const [setup, setSetup] = useState(() => load('skiply.biz.setup', {}));
  const tv = useLocation().pathname.startsWith('/business-panel/display');
  const navigate = useNavigate();

  const finish = useCallback((v, s, to) => {
    save('skiply.biz', v); save('skiply.biz.setup', s);
    setVenue(v); setSetup(s);
    navigate(to || '/business-panel');
  }, [navigate]);
  const onSetup = useCallback((patch) => setSetup((s) => { const n = { ...s, ...patch }; save('skiply.biz.setup', n); return n; }), []);
  const onSwitch = useCallback(() => { save('skiply.biz', null); save('skiply.biz.setup', {}); setVenue(null); setSetup({}); navigate('/business-panel'); }, [navigate]);

  if (!venue) {
    return (
      <div className="console console--simple">
        <Sidebar />
        <main className="console-main">
          <Routes>
            <Route path="/display" element={<Display />} />
            <Route path="*" element={<Onboarding onFinish={finish} />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <SimProvider key={venue.id} venue={venue} setup={setup}>
      <div className={`console console--simple ${tv ? 'console--tv' : ''}`}>
        <Sidebar />
        <main className="console-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/queue" element={<LiveQueue />} />
            <Route path="/display" element={<DisplayShared />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings setup={setup} onSetup={onSetup} onSwitch={onSwitch} />} />
            {REDIRECTS.map(([from, to]) => <Route key={from} path={`/${from}`} element={<Navigate to={to} replace />} />)}
            <Route path="*" element={<Navigate to="/business-panel" replace />} />
          </Routes>
        </main>
      </div>
    </SimProvider>
  );
}

function DisplayShared() {
  const sim = useSim();
  return <Display sim={sim} venue={sim.venue} />;
}
