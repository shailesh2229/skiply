import React, { useEffect, useState } from 'react';
import SplitFlap from './SplitFlap';
import { StationClock } from './Clock';

const WORDS = ['QUEUE', 'OPD LINE', 'BANK LINE', 'SALON WAIT', 'TABLE WAIT', 'POST LINE'];

// Line drawing of an iron-and-glass station shed.
function Arch() {
  const ribs = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg className="gh-arch" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="ghGlow" cx="50%" cy="60%" r="55%">
          <stop offset="0" stopColor="#E8A33D" stopOpacity=".22" />
          <stop offset=".5" stopColor="#7A5420" stopOpacity=".08" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ghFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4E9C8" stopOpacity=".26" />
          <stop offset="1" stopColor="#F4E9C8" stopOpacity=".04" />
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#ghGlow)" />
      <g fill="none" stroke="url(#ghFade)" strokeWidth="1.2">
        <path d="M40 700 V420 A560 560 0 0 1 1160 420 V700" strokeWidth="2.2" />
        <path d="M110 700 V430 A490 490 0 0 1 1090 430 V700" />
        {ribs.map((i) => {
          const a = Math.PI - (i / 12) * Math.PI;
          const x1 = 600 + Math.cos(a) * 490, y1 = 430 - Math.sin(a) * 490 * 0.72;
          const x2 = 600 + Math.cos(a) * 560, y2 = 420 - Math.sin(a) * 560 * 0.72;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        {ribs.slice(1, -1).map((i) => {
          const a = Math.PI - (i / 12) * Math.PI;
          return <line key={`g${i}`} x1="600" y1="700" x2={600 + Math.cos(a) * 490} y2={430 - Math.sin(a) * 490 * 0.72} strokeOpacity=".35" />;
        })}
        {[0.25, 0.5, 0.75].map((k) => (
          <ellipse key={k} cx="600" cy="430" rx={490 * k} ry={490 * 0.72 * k} strokeOpacity=".3" />
        ))}
        <path d="M0 640 H1200 M0 668 H1200" strokeOpacity=".5" />
      </g>
    </svg>
  );
}

export default function GrandHall({ children, ticker }) {
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), 3200); return () => clearInterval(id); }, []);
  return (
    <section className="gh">
      <Arch />
      <div className="gh-rays" aria-hidden="true" />
      <div className="gh-dust" aria-hidden="true">{Array.from({ length: 18 }, (_, k) => <i key={k} style={{ '--k': k }} />)}</div>
      <div className="gh-clock" aria-hidden="true">
        <span className="gh-chain" />
        <StationClock size={112} />
      </div>
      <div className="wrap gh-in">
        <h1 className="gh-title">
          <span className="sr-only">Skip the queue</span>
          <SplitFlap text="SKIP THE" size={8} className="gh-flap" stagger={60} />
          <SplitFlap text={WORDS[i]} size={10} align="center" className="gh-flap gh-flap-2" stagger={45} />
        </h1>
        {children}
      </div>
      {ticker}
    </section>
  );
}
