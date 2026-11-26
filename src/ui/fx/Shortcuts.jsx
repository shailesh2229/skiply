import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PALETTE_LIST } from '../../data/palettes';
import { burst, chime, revealTransition, toast } from '../../lib/fx';
import { save } from '../../lib/storage';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const GO = { h: '/', e: '/explore', t: '/tickets', p: '/pulse', r: '/errands', c: '/compare', s: '/saved', b: '/business-panel', a: '/about' };
const LIST = [
  ['/', 'Search venues, cities, pages'], ['?', 'This sheet'], ['T', 'Switch Day / Night'],
  ['G then H', 'Home'], ['G then E', 'Departures'], ['G then P', 'City Pulse'], ['G then R', 'Errand Run'],
  ['G then T', 'My tickets'], ['G then S', 'Saved stations'], ['G then C', 'Compare'], ['G then B', 'Business console'],
  ['↑↑↓↓←→←→ B A', 'Something for rush hour'],
];

const typing = (e) => /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;

/** Runs a little train across the screen. Exported so the logo can call it too. */
export function runTrain() {
  window.dispatchEvent(new Event('skiply:train'));
}

export default function Shortcuts() {
  const navigate = useNavigate();
  const { resolvedPalette, setPalette } = useApp();
  const [sheet, setSheet] = useState(false);
  const [train, setTrain] = useState(0);
  const seq = useRef([]), g = useRef(0);
  const palRef = useRef(resolvedPalette); palRef.current = resolvedPalette;

  useEffect(() => {
    const onTrain = () => setTrain((n) => n + 1);
    window.addEventListener('skiply:train', onTrain);
    const key = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      seq.current = [...seq.current, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (KONAMI.every((k, i) => seq.current[i] === k)) {
        seq.current = [];
        save('skiply.secret', true);
        setTrain((n) => n + 1);
        chime('turn', true);
        revealTransition(() => setPalette('midnight'), window.innerWidth / 2, window.innerHeight / 2);
        setTimeout(() => burst(window.innerWidth / 2, window.innerHeight / 2, 48), 400);
        toast({ tone: 'go', icon: '★', title: 'Rush hour mode unlocked', body: 'You found the secret platform. The night express is through.' });
        return;
      }
      if (typing(e)) return;
      if (e.key === 'Escape') { setSheet(false); return; }
      if (e.key === '?') { e.preventDefault(); setSheet((s) => !s); return; }
      if (e.key === '/') { e.preventDefault(); window.dispatchEvent(new Event('skiply:cmdk')); return; }
      if (Date.now() - g.current < 900 && GO[e.key.toLowerCase()]) { g.current = 0; navigate(GO[e.key.toLowerCase()]); return; }
      if (e.key.toLowerCase() === 'g') { g.current = Date.now(); return; }
      if (e.key.toLowerCase() === 't') {
        const i = PALETTE_LIST.findIndex((p) => p.key === palRef.current);
        const next = PALETTE_LIST[(i + 1) % PALETTE_LIST.length];
        revealTransition(() => setPalette(next.key), window.innerWidth - 120, 40);
        toast({ title: `Livery: ${next.label}`, body: next.tagline, ttl: 2600, dedupe: 'livery' });
      }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('skiply:train', onTrain); };
  }, [navigate, setPalette]);

  return (
    <>
      {train > 0 && (
        <div key={train} className="fx-train" aria-hidden="true" onAnimationEnd={() => setTrain(0)}>
          <div className="fx-train-body">
            <span className="fx-loco"><i className="fx-lamp" />SKIPLY EXP</span>
            {['NO', 'WAIT', 'ING', 'EVER'].map((w) => <span key={w} className="fx-car">{w}</span>)}
          </div>
          <div className="fx-steam"><i /><i /><i /><i /></div>
        </div>
      )}
      {sheet && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setSheet(false)}>
          <div className="modal kb-sheet" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
            <div className="modal-head">
              <div><p className="kicker">Driver’s cab</p><h2 className="h3">Keyboard shortcuts</h2></div>
              <button className="icon-btn" onClick={() => setSheet(false)} aria-label="Close">✕</button>
            </div>
            <dl className="kb-list">
              {LIST.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{k.split(' ').map((x, i) => (x === 'then' ? <span key={i} className="muted"> then </span> : <kbd key={i}>{x}</kbd>))}</dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
