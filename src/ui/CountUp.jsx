import React, { useEffect, useRef, useState } from 'react';

export default function CountUp({ value, duration = 1400, suffix = '' }) {
  const [shown, setShown] = useState(0);
  const el = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    if (value == null) return undefined;
    let raf;
    const run = () => {
      const from = started.current ? shown : 0; started.current = true;
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration), e = 1 - (1 - k) ** 4;
        setShown(Math.round(from + (value - from) * e));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { run(); io.disconnect(); } });
    io.observe(el.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={el}>{shown.toLocaleString('en-IN')}{suffix}</span>;
}
