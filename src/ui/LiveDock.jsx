import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNow } from '../lib/hooks';
import { ticketState } from '../lib/tickets';
import { CATEGORIES } from '../data/categories';
import { load, save } from '../lib/storage';
import { countdown, fmtTime } from './Ticket';
import '../styles/tickets2.css';

const RANK = { now: 0, soon: 1, waiting: 2, scheduled: 3 };

/** Floating "live activity" for the most urgent active ticket. */
export default function LiveDock() {
  const { tickets } = useApp();
  const now = useNow(5000);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => load('skiply.dock.hidden', null));

  const top = useMemo(() => tickets
    .map((t) => ({ t, st: ticketState(t, now) }))
    .filter(({ st }) => st.phase in RANK)
    .sort((a, b) => RANK[a.st.phase] - RANK[b.st.phase] || (a.st.eta || 0) - (b.st.eta || 0))[0], [tickets, now]);

  if (!top || pathname.startsWith('/tickets') || pathname.startsWith('/business-panel')) return null;
  const { t, st } = top;
  // Dismissed for this ticket+phase only, so a phase change brings it back.
  if (hidden === `${t.id}:${st.phase}`) return null;

  const cat = CATEGORIES[t.category];
  const live = t.mode === 'live';
  const big = st.phase === 'now' ? 'Now' : live ? st.ahead : countdown(st.until);
  const bigLabel = st.phase === 'now' ? 'your turn' : live ? 'ahead' : 'to slot';
  const progress = live ? st.progress : Math.max(0.04, 1 - Math.min(1, (st.until || 0) / (24 * 3600000)));
  const hide = () => { const k = `${t.id}:${st.phase}`; setHidden(k); save('skiply.dock.hidden', k); };

  return (
    <aside className={`ldock ph-${st.phase} ${open ? 'is-open' : ''}`} style={{ '--cat': cat.neon }} aria-live="polite" aria-label="Your active ticket">
      <button className="ldock-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ldock-token">{t.token}</span>
        <span className="ldock-t">
          <b>{t.placeName}</b>
          <span>{st.label}{st.eta ? ` · ${fmtTime(st.eta)}` : ''}</span>
        </span>
        <span className="ldock-big">{big}<small>{bigLabel}</small></span>
        <svg className="ldock-chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 7.5 6 4.5 9 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <div className="ldock-bar" aria-hidden="true"><span style={{ width: `${Math.round((progress || 0) * 100)}%` }} /></div>
      <div className="ldock-more">
        <div>
          <div className="ldock-body">
            <p>{t.department} · Platform {cat.platform}. {st.phase === 'now' ? 'Show your QR at the counter.' : live ? 'Your token counts down as the line moves.' : 'We’ll nudge you when it’s time to leave.'}</p>
            <div className="ldock-acts">
              <Link to="/tickets" className="btn btn-ink btn-sm">Open ticket</Link>
              <a className="btn btn-line btn-sm" href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`} target="_blank" rel="noreferrer">Directions ↗</a>
              <button className="btn btn-ghost btn-sm" onClick={hide}>Hide</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
