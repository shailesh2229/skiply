import React, { useEffect, useRef } from 'react';

/** Hairline progress rail with a little train riding it. */
export default function ScrollRail() {
  const bar = useRef(null);
  useEffect(() => {
    let raf;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        const k = h > 0 ? Math.min(1, window.scrollY / h) : 0;
        bar.current?.style.setProperty('--k', k);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={bar} className="rail-progress" aria-hidden="true"><span /></div>;
}
