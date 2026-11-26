import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Glyph from '../components/Shared/Glyph';

/**
 * Plain-language page header: title, one sentence saying what the page is for,
 * and a "?" that opens a short how-to guide.
 */
const SECTION = { '': 'Home', queue: 'Live queue', display: 'TV display', reports: 'Reports', settings: 'Settings' };

export default function PageHead({ title, accent, lead, guide, actions }) {
  const [open, setOpen] = useState(false);
  const section = SECTION[useLocation().pathname.split('/')[2] || ''] || 'Home';
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <header className="sp-head">
      <div className="sp-head-l">
        <p className="sp-crumb">Business <span aria-hidden="true">/</span> {section}</p>
        <h1 className="sp-title">{title}{accent && <> <span>{accent}</span></>}</h1>
        <p className="sp-lead">{lead}</p>
      </div>
      <div className="sp-head-r">
        {actions}
        {guide && <button className="sp-help" onClick={() => setOpen(true)} aria-label="How this page works" title="How this page works">?</button>}
      </div>
      {open && (
        <div className="sp-drawer-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <aside className="sp-drawer" role="dialog" aria-modal="true" aria-label={`How ${title} works`}>
            <div className="sp-drawer-h">
              <p className="sp-k">Quick guide</p>
              <button className="sp-x" onClick={() => setOpen(false)} aria-label="Close guide">✕</button>
            </div>
            <h2 className="sp-drawer-t">{title} {accent}</h2>
            <ol className="sp-steps">
              {guide.map(([b, t], i) => <li key={i}><b>{b}</b><span>{t}</span></li>)}
            </ol>
            <button className="sp-btn sp-btn-primary" onClick={() => setOpen(false)}>Got it</button>
          </aside>
        </div>
      )}
    </header>
  );
}

/** Friendly empty state. */
export function Empty({ icon = 'coffee', title, children, action }) {
  return (
    <div className="sp-empty">
      <span className="sp-empty-i" aria-hidden="true"><Glyph n={icon} size={26} /></span>
      <b>{title}</b>
      <p>{children}</p>
      {action}
    </div>
  );
}

/** Simple tab bar driven by ?tab= */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="sp-tabs" role="tablist">
      {tabs.map(([k, label, hint]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} title={hint}>
          {label}
        </button>
      ))}
    </div>
  );
}
