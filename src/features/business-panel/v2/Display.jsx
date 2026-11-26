import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SplitFlap from '../../../ui/SplitFlap';
import BrandMark from '../../../ui/BrandMark';
import Emblem from '../../../ui/Emblem';
import { useApp } from '../../../context/AppContext';
import { useNow } from '../../../lib/hooks';
import { load } from '../../../lib/storage';
import { fmtWait } from '../../../lib/estimate';
import { chime, speak } from '../../../lib/fx';
import { DEFAULT_CITY } from '../../../data/cities';
import useQueueSim from './useQueueSim';
import Glyph from '../components/Shared/Glyph';
import './display.css';

// A 24/7 hospital OPD stands in when no venue has been claimed yet.
const DEMO = { id: 'demo-display', name: 'Your venue', category: 'hospital', lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng, hours: '24/7', address: '' };

const spoken = (token) => token.replace('-', ' ').replace(/(\d)/g, ' $1').replace(/\s+/g, ' ').trim();

/** Demo screen when no business is set up yet. */
function DisplayDemo() {
  const venue = useMemo(() => load('skiply.biz', null) || DEMO, []);
  const { tickets } = useApp();
  const sim = useQueueSim(venue, tickets, { speed: 10 });
  return <DisplayScreen sim={sim} venue={venue} demo announce />;
}

/** Public "Now serving" screen for a TV above the counters. */
export default function Display({ sim, venue }) {
  return sim ? <DisplayScreen sim={sim} venue={venue} /> : <DisplayDemo />;
}

function DisplayScreen({ sim, venue, demo, announce }) {
  const now = useNow(1000);
  const navigate = useNavigate();
  const root = useRef(null);
  const [flash, setFlash] = useState(null);
  const [full, setFull] = useState(false);

  // announce every call (automatic or manual)
  useEffect(() => sim.onCall((c) => {
    setFlash({ token: c.p.token, counter: c.counter, dept: c.p.dept, n: c.n });
    if (!announce && c.manual) return; // the console already announced it
    chime('dingdong', true);
    setTimeout(() => speak(`Token ${spoken(c.p.token)}, please proceed to counter ${c.counter}.`, true), 900);
  }), [sim.onCall, announce]); // eslint-disable-line react-hooks/exhaustive-deps

  const callNext = useCallback(() => sim.callNext(), [sim]);

  useEffect(() => {
    const key = (e) => {
      if (e.code === 'Space') { e.preventDefault(); callNext(); }
      if (e.key === 'Escape' && !document.fullscreenElement) navigate('/business-panel');
    };
    const fs = () => setFull(!!document.fullscreenElement);
    window.addEventListener('keydown', key);
    document.addEventListener('fullscreenchange', fs);
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', fs); };
  }, [callNext, navigate]);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else root.current?.requestFullscreen?.().catch(() => {});
  };

  const serving = sim.counters.filter((c) => c.on);
  const current = flash || (serving.find((c) => c.serving) && { token: serving.find((c) => c.serving).serving.token, counter: serving.find((c) => c.serving).id });
  const next = sim.queue.slice(0, 5);
  const d = new Date(now);
  const announcements = [
    `Welcome to ${venue.name}`,
    `${sim.queue.length} ${sim.queue.length === 1 ? 'person' : 'people'} waiting`,
    sim.waitNow != null ? `New arrivals wait about ${fmtWait(sim.waitNow)}` : 'Counters are closed',
    `${sim.open} counter${sim.open === 1 ? '' : 's'} open`,
    'Skip the line next time: take a token on Skiply',
    'Please keep your token number handy',
  ];

  return (
    <div className={`tv ${full ? 'is-full' : ''}`} ref={root}>
      <header className="tv-top">
        <div className="tv-venue">
          <span className="tv-ico"><Emblem category={venue.category} size={26} /></span>
          <div>
            <p className="tv-k">{sim.cat.singular} · Live queue{demo ? ' · demo' : ''}</p>
            <h1 className="tv-name">{venue.name}</h1>
          </div>
        </div>
        <div className="tv-clock">
          <b>{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}<span className="tv-sec">:{String(d.getSeconds()).padStart(2, '0')}</span></b>
          <span>{d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <div className="tv-ctl">
          <button className="tv-btn" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
          <Link to="/business-panel" className="tv-btn" aria-label="Exit display"><Glyph n="x" /></Link>
        </div>
      </header>

      <main className="tv-main">
        <section className="tv-now" aria-live="assertive">
          <p className="tv-label"><span className="tv-led" /> Now serving</p>
          <div className="tv-token" key={current?.token || 'none'}>
            <SplitFlap text={current ? current.token : '---'} size={5} align="center" stagger={70} />
          </div>
          <div className="tv-counter">
            <span className="tv-pp">Please proceed to</span>
            <SplitFlap text={current ? `COUNTER ${current.counter}` : 'PLEASE WAIT'} size={11} align="center" stagger={40} />
          </div>
          {current?.dept && <p className="tv-dept">{current.dept}</p>}
        </section>

        <aside className="tv-side">
          <div className="tv-panel">
            <p className="tv-ph">Next up</p>
            <ol className="tv-next">
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i} className={next[i] ? '' : 'is-empty'}>
                  <span className="tv-pos">{i + 1}</span>
                  <SplitFlap text={next[i]?.token || ''} size={5} />
                  <span className="tv-nd">{next[i]?.dept || ''}{next[i]?.source === 'app' && <em> · app</em>}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="tv-panel tv-counters">
            {serving.map((c) => (
              <div key={c.id} className={`tv-c ${current?.counter === c.id ? 'is-hot' : ''}`}>
                <span className="tv-cn">Counter {c.id}</span>
                <b>{c.serving ? c.serving.token : '—'}</b>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <footer className="tv-foot">
        <div className="tv-stats">
          <span><b>{sim.queue.length}</b> waiting</span>
          <span><b>{sim.waitNow != null ? fmtWait(sim.waitNow) : '—'}</b> wait for new arrivals</span>
          <span><b>{sim.served}</b> served today</span>
          <span className="tv-brand"><BrandMark size={18} /> Powered by Skiply</span>
        </div>
        <button className="tv-call" onClick={callNext} disabled={!sim.queue.length || !sim.open}>
          Call next <kbd>Space</kbd>
        </button>
      </footer>

      <div className="tv-ticker" aria-hidden="true">
        <div className="tv-track">
          {[0, 1].map((k) => (
            <div key={k} className="tv-set">
              {announcements.map((a) => <span key={a}>{a} <i>·</i></span>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
