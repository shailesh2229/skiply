import React, { useEffect, useRef, useState } from 'react';

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Flap({ ch, delay }) {
  const [{ cur, n }, set] = useState({ cur: ' ', n: 0 });
  const setCur = (c) => set((s) => ({ cur: c, n: s.n + 1 }));
  const timers = useRef([]);
  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (reduce || ch === cur) { if (ch !== cur) setCur(ch); return undefined; }
    const steps = ch === ' ' ? 2 : 3 + Math.floor(Math.random() * 6);
    for (let i = 0; i <= steps; i++) {
      timers.current.push(setTimeout(() => {
        setCur(i === steps ? ch : POOL[Math.floor(Math.random() * POOL.length)]);
      }, delay + i * 55));
    }
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch, delay]);
  return (
    <span className="flap" aria-hidden="true">
      <span key={n} className="flap-face">{cur === ' ' ? ' ' : cur}</span>
    </span>
  );
}

/** Renders `text` as a row of split-flap cells, padded/truncated to `size`. */
export default function SplitFlap({ text = '', size, className = '', stagger = 22, align = 'left' }) {
  let t = String(text).toUpperCase().replace(/[^\x20-\x7E]/g, '');
  if (size) {
    t = t.length > size ? t.slice(0, size - 1) + '.' : t;
    if (align === 'center') {
      const left = Math.floor((size - t.length) / 2);
      t = (' '.repeat(left) + t).padEnd(size, ' ');
    } else t = align === 'right' ? t.padStart(size, ' ') : t.padEnd(size, ' ');
  }
  return (
    <span className={`splitflap ${className}`} role="img" aria-label={String(text)}>
      {t.split('').map((c, i) => <Flap key={i} ch={c} delay={i * stagger} />)}
    </span>
  );
}
