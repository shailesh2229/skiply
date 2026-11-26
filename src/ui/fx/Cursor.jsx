import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';

const HOT = 'a, button, [role="button"], input, select, textarea, label, .chip, [data-cursor]';

/** A lagging ring + precise dot. Grows over anything clickable and shows `data-cursor` labels. */
export default function Cursor() {
  const { settings } = useApp();
  const dot = useRef(null), ring = useRef(null), label = useRef(null);
  const on = settings.cursor;

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!on || !fine || reduce) { document.documentElement.classList.remove('has-cursor'); return undefined; }
    document.documentElement.classList.add('has-cursor');
    let x = -100, y = -100, rx = -100, ry = -100, raf;
    const move = (e) => {
      x = e.clientX; y = e.clientY;
      dot.current.style.transform = `translate(${x}px, ${y}px)`;
      const hot = e.target.closest?.(HOT);
      ring.current.classList.toggle('is-hot', !!hot);
      if (hot?.classList?.contains('btn')) {
        const r = hot.getBoundingClientRect();
        hot.style.setProperty('--mx', `${x - r.left}px`);
        hot.style.setProperty('--my', `${y - r.top}px`);
      }
      const txt = hot?.getAttribute?.('data-cursor') || '';
      label.current.textContent = txt;
      ring.current.classList.toggle('has-label', !!txt);
      const text = !hot && e.target.closest?.('p, h1, h2, h3, li, td');
      ring.current.classList.toggle('is-text', !!text);
    };
    const down = () => ring.current.classList.add('is-down');
    const up = () => ring.current.classList.remove('is-down');
    const leave = () => { ring.current.style.opacity = '0'; dot.current.style.opacity = '0'; };
    const enter = () => { ring.current.style.opacity = ''; dot.current.style.opacity = ''; };
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.current.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
      document.documentElement.classList.remove('has-cursor');
    };
  }, [on]);

  if (!on) return null;
  return (
    <>
      <div ref={ring} className="cur-ring" aria-hidden="true"><span ref={label} className="cur-label mono" /></div>
      <div ref={dot} className="cur-dot" aria-hidden="true" />
    </>
  );
}
