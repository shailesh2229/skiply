import React, { useRef, useState } from 'react';
import BrandMark from './BrandMark';

const THRESHOLD = 110;

/** A big ticket whose stub you can drag off. */
export default function TearTicket({ city }) {
  const [dx, setDx] = useState(0);
  const [torn, setTorn] = useState(false);
  const start = useRef(null);

  const down = (e) => { if (torn) return; start.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (start.current == null) return; setDx(Math.max(0, Math.min(180, e.clientX - start.current))); };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    if (dx > THRESHOLD) setTorn(true); else setDx(0);
  };
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTorn(true); } };

  return (
    <div className={`tear ${torn ? 'is-torn' : ''}`}>
      <div className="tear-main">
        <div className="tear-top mono"><span>SKIPLY · ADMIT ONE</span><span>PLATFORM ANY</span></div>
        <p className="tear-to display">{city}<span>→</span>Your turn</p>
        <div className="tear-row mono">
          <span>CLASS<b>NO WAITING</b></span>
          <span>FARE<b>₹0</b></span>
          <span>VALID<b>TODAY</b></span>
        </div>
        <p className="tear-msg">{torn ? 'That’s it. You’re in line, and you’re not standing in it.' : 'Drag the stub to take your token →'}</p>
        {torn && <button className="btn btn-line btn-sm tear-reset" onClick={() => { setTorn(false); setDx(0); }}>Print another</button>}
      </div>
      <div
        className="tear-stub"
        role="button" tabIndex={0} aria-label="Tear off the stub"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
        style={torn ? undefined : { transform: `translateX(${dx}px) rotate(${dx / 14}deg)`, transition: start.current == null ? 'transform .4s cubic-bezier(.2,.9,.3,1.3)' : 'none' }}
      >
        <BrandMark size={44} />
        <span className="tear-token">S-001</span>
        <span className="mono tear-grip">⇢ PULL</span>
      </div>
    </div>
  );
}
