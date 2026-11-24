import React, { useRef } from 'react';

const START = 135, SWEEP = 270; // degrees, 0 = east, clockwise
const rad = (d) => (d * Math.PI) / 180;
const pt = (r, deg) => [100 + r * Math.cos(rad(deg)), 100 + r * Math.sin(rad(deg))];
function arc(r, from, to) {
  const [x1, y1] = pt(r, from), [x2, y2] = pt(r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/** Thermostat-style dial. Drag the knob (or use arrow keys) to pick a value in [min, max]. */
export default function Dial({ value, min = 0, max = 8, onChange, load = 0, label, big, sub }) {
  const svg = useRef(null);
  const dragging = useRef(false);
  const deg = START + ((value - min) / (max - min)) * SWEEP;
  const [kx, ky] = pt(80, deg);

  const fromEvent = (e) => {
    const r = svg.current.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    let a = (Math.atan2(y, x) * 180) / Math.PI; if (a < 0) a += 360;
    let rel = a - START; if (rel < 0) rel += 360;
    if (rel > SWEEP) rel = rel - SWEEP < (360 - SWEEP) / 2 ? SWEEP : 0;
    const v = Math.round(min + (rel / SWEEP) * (max - min));
    if (v !== value) onChange(v);
  };
  const down = (e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromEvent(e); };
  const move = (e) => dragging.current && fromEvent(e);
  const up = () => { dragging.current = false; };
  const key = (e) => {
    if (['ArrowUp', 'ArrowRight'].includes(e.key)) { e.preventDefault(); onChange(Math.min(max, value + 1)); }
    if (['ArrowDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); onChange(Math.max(min, value - 1)); }
  };
  const hue = load < 0.5 ? 'var(--d-go)' : load < 0.85 ? 'var(--d-warn)' : 'var(--d-hot)';

  return (
    <div className="dial" style={{ '--hue': hue }}>
      <svg ref={svg} viewBox="0 0 200 200" role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
        <defs>
          <linearGradient id="dialG" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#7C3AED" /><stop offset=".55" stopColor="#C084FC" /><stop offset="1" stopColor="#F2B233" />
          </linearGradient>
          <filter id="dialGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        {Array.from({ length: 61 }, (_, i) => {
          const a = START + (i / 60) * SWEEP, on = a <= deg;
          const [x1, y1] = pt(96, a), [x2, y2] = pt(i % 5 ? 92 : 89, a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={`dial-tick ${on ? 'on' : ''}`} />;
        })}
        <path d={arc(80, START, START + SWEEP)} className="dial-track" />
        <path d={arc(80, START, Math.max(START + 0.01, deg))} stroke="url(#dialG)" className="dial-val-glow" filter="url(#dialGlow)" />
        <path d={arc(80, START, Math.max(START + 0.01, deg))} stroke="url(#dialG)" className="dial-val" />
        {Array.from({ length: max - min + 1 }, (_, i) => {
          const [x, y] = pt(62, START + (i / (max - min)) * SWEEP);
          return <text key={i} x={x} y={y + 3} className={`dial-num ${i + min === value ? 'on' : ''}`}>{i + min}</text>;
        })}
        <circle cx="100" cy="100" r="46" className="dial-core" />
        <g className="dial-knob" transform={`translate(${kx} ${ky})`}>
          <circle r="11" className="dial-knob-halo" />
          <circle r="7.5" className="dial-knob-dot" />
        </g>
      </svg>
      <div className="dial-center">
        <span className="dial-big">{big}</span>
        <span className="dial-sub">{sub}</span>
      </div>
    </div>
  );
}
