import React, { useEffect, useState } from 'react';
import SplitFlap from './SplitFlap';

// A one-per-session station board that flips to SKIPLY, then lifts away.
export default function Intro() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem('skiply.intro'); } catch (e) { return false; }
  });
  const [leaving, setLeaving] = useState(false);
  const [word, setWord] = useState('      ');
  useEffect(() => {
    if (!show) return undefined;
    try { sessionStorage.setItem('skiply.intro', '1'); } catch (e) { /* ignore */ }
    const a = setTimeout(() => setWord('SKIPLY'), 60);
    const b = setTimeout(() => setLeaving(true), 760);
    const c = setTimeout(() => setShow(false), 1150);
    return () => [a, b, c].forEach(clearTimeout);
  }, [show]);
  if (!show) return null;
  return (
    <div className={`intro ${leaving ? 'is-leaving' : ''}`} onClick={() => setShow(false)} role="presentation">
      <div className="intro-in">
        <p className="mono intro-k">NOW ARRIVING</p>
        <SplitFlap text={word} size={6} className="intro-board" stagger={45} />
        <p className="mono intro-k">SKIP THE LINE</p>
      </div>
    </div>
  );
}
