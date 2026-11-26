import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import Emblem from './Emblem';
import '../styles/pulse.css';

/** Floating pill showing venues queued for comparison. */
export default function CompareTray() {
  const { compare, toggleCompare } = useApp();
  const { pathname } = useLocation();
  const hidden = pathname === '/compare' || pathname.startsWith('/business-panel');
  const visible = compare.length > 0 && !hidden;
  const last = useRef(compare);
  if (compare.length) last.current = compare;
  const items = compare.length ? compare : last.current;
  const [bump, setBump] = useState(false);
  const prev = useRef(compare.length);
  useEffect(() => {
    if (compare.length > prev.current) { setBump(true); const id = setTimeout(() => setBump(false), 500); prev.current = compare.length; return () => clearTimeout(id); }
    prev.current = compare.length;
    return undefined;
  }, [compare.length]);

  return (
    <div className={`ctray ${visible ? 'is-on' : ''} ${bump ? 'is-bump' : ''}`} aria-hidden={!visible} role="region" aria-label="Compare tray">
      <span className="ctray-k mono">COMPARE</span>
      <div className="ctray-list">
        {items.map((p) => (
          <span key={p.id} className="ctray-i pz-cc" style={{ '--c': CATEGORIES[p.category].color, '--cn': CATEGORIES[p.category].neon }} title={p.name}>
            <Emblem category={p.category} size={15} />
            <span className="ctray-n">{p.name}</span>
            <button onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name} from compare`} tabIndex={visible ? 0 : -1}>×</button>
          </span>
        ))}
        {Array.from({ length: Math.max(0, 3 - items.length) }, (_, i) => <span key={`e${i}`} className="ctray-slot" aria-hidden="true" />)}
      </div>
      <span className="ctray-c mono">{compare.length}/3</span>
      <Link to="/compare" className="ctray-go" tabIndex={visible ? 0 : -1}>Compare <span aria-hidden="true">→</span></Link>
    </div>
  );
}
