import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';
import { fmtKm } from '../lib/geo';
import SplitFlap from './SplitFlap';

const City3D = lazy(() => import('./City3D'));
const WORDS = ['QUEUE', 'OPD LINE', 'BANK LINE', 'SALON WAIT', 'TABLE WAIT', 'POST LINE'];

/** Scroll-driven story over a real 3D city. Step 0 is the hero. */
export default function CityStory({ location, places, now, loading, onSelect, heroExtras }) {
  const [step, setStep] = useState(0);
  const [word, setWord] = useState(0);
  const [ready, setReady] = useState(false);
  const refs = useRef([]);

  useEffect(() => { const id = setInterval(() => setWord((n) => (n + 1) % WORDS.length), 3200); return () => clearInterval(id); }, []);

  const d = new Date(now);
  const scenes = useMemo(() => {
    const open = places.map((p) => ({ p, e: estimateAt(p, d) })).filter((x) => x.e.status.open !== false);
    const quick = [...open].filter((x) => x.p.distance < 2).sort((a, b) => a.e.wait - b.e.wait || a.p.distance - b.p.distance)[0];
    const nearest = (cat) => places.find((p) => p.category === cat);
    const busiest = (cat) => open.filter((x) => x.p.category === cat).sort((a, b) => b.e.wait - a.e.wait)[0];
    const c = { lat: location.lat, lng: location.lng };
    const busiestAll = [...open].sort((a, b) => b.e.wait - a.e.wait)[0];
    const list = [{ kind: 'hero', quick, busiest: busiestAll, shot: { center: c, zoom: 14.7, pitch: 62, bearing: -24, orbit: true, pulseId: quick?.p.id } }];
    if (quick) list.push({ kind: 'quick', x: quick, shot: { center: quick.p, zoom: 16.8, pitch: 70, bearing: 35, focusId: quick.p.id, orbit: true } });
    ['hospital', 'bank', 'salon'].forEach((cat) => {
      const n = nearest(cat);
      if (n) list.push({ kind: 'cat', cat, n, busy: busiest(cat), count: places.filter((p) => p.category === cat).length, shot: { center: n, zoom: 15.9, pitch: 66, bearing: -40 + list.length * 35, focusCat: cat, orbit: true } });
    });
    list.push({ kind: 'all', shot: { center: c, zoom: 13.7, pitch: 48, bearing: 0, orbit: true } });
    return list.map((s, i) => ({ ...s, shot: { ...s.shot, key: `${i}-${s.kind}-${location.lat}-${places.length > 0}` } }));
  }, [places, location.lat, location.lng, Math.floor(now / 300000)]); // eslint-disable-line react-hooks/exhaustive-deps

  const section = useRef(null);
  useEffect(() => {
    const io = new IntersectionObserver(([en]) => document.body.classList.toggle('nav-dark', en.isIntersecting), { rootMargin: '-20px 0px -92% 0px' });
    io.observe(section.current);
    return () => { io.disconnect(); document.body.classList.remove('nav-dark'); };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) setStep(+en.target.dataset.step);
    }), { threshold: 0.55 });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, [scenes.length]);

  const active = scenes[Math.min(step, scenes.length - 1)];
  return (
    <section ref={section} className={`story ${ready ? 'is-ready' : ''}`}>
      <div className="story-sticky">
        <Suspense fallback={null}>
          <City3D places={places} now={now} shot={active.shot} onSelect={onSelect} onReady={() => setReady(true)} />
        </Suspense>
        <div className="story-veil" aria-hidden="true" />
        <div className="story-scan" aria-hidden="true" />
        <div className="story-hud mono" aria-hidden="true">
          <span>{location.lat.toFixed(4)}°N {location.lng.toFixed(4)}°E</span>
          <span>{loading && !places.length ? 'LOADING OSM…' : `${places.length} VENUES · LIVE ESTIMATES`}</span>
          <span className="story-dots">{scenes.map((s, i) => <i key={i} className={i === step ? 'on' : ''} />)}</span>
        </div>
      </div>

      <div className="story-steps">
        {scenes.map((s, i) => (
          <div key={s.shot.key} ref={(r) => { refs.current[i] = r; }} data-step={i} className={`story-step step-${s.kind} ${i === step ? 'is-active' : ''}`}>
            {s.kind === 'hero' && (
              <div className="story-hero">
                <h1 className="gh-title">
                  <span className="sr-only">Skip the queue</span>
                  <SplitFlap text="SKIP THE" size={8} className="gh-flap" stagger={60} />
                  <SplitFlap text={WORDS[word]} size={10} align="center" className="gh-flap gh-flap-2" stagger={45} />
                </h1>
                {heroExtras}
                <span className="story-scroll mono">SCROLL TO FLY THROUGH {location.name.toUpperCase()} ↓</span>
              </div>
            )}
            {s.kind === 'hero' && s.quick && (
              <Link to={`/place/${s.quick.p.id}`} state={{ place: s.quick.p }} className="float-card float-l">
                <span className="float-k mono"><i className="float-dot go" /> SHORTEST NOW</span>
                <b>{s.quick.p.name}</b>
                <span className="float-v"><em>{fmtWait(s.quick.e.wait)}</em> · {fmtKm(s.quick.p.distance)}</span>
              </Link>
            )}
            {s.kind === 'hero' && s.busiest && (
              <Link to={`/place/${s.busiest.p.id}`} state={{ place: s.busiest.p }} className="float-card float-r">
                <span className="float-k mono"><i className="float-dot busy" /> BUSIEST NOW</span>
                <b>{s.busiest.p.name}</b>
                <span className="float-v"><em className="busy">{fmtWait(s.busiest.e.wait)}</em> · {s.busiest.e.people} waiting</span>
              </Link>
            )}
            {s.kind === 'quick' && (
              <article className="story-card">
                <p className="kicker">Shortest line near you · right now</p>
                <h2 className="h2">{s.x.p.name}</h2>
                <p className="story-big display">{fmtWait(s.x.e.wait)}</p>
                <p className="muted">{CATEGORIES[s.x.p.category].singular} · {fmtKm(s.x.p.distance)} away · ≈ {s.x.e.people} waiting</p>
                <Link to={`/place/${s.x.p.id}`} state={{ place: s.x.p }} className="btn btn-ink">Take a token →</Link>
              </article>
            )}
            {s.kind === 'cat' && (
              <article className="story-card" style={{ '--c': CATEGORIES[s.cat].neon }}>
                <p className="kicker" style={{ '--c': CATEGORIES[s.cat].neon }}><span className="story-sw" /> {CATEGORIES[s.cat].label}</p>
                <h2 className="h2">{s.count} {CATEGORIES[s.cat].label.toLowerCase()} <em>lit up.</em></h2>
                <p>Each glowing column is a real {CATEGORIES[s.cat].singular.toLowerCase()} from OpenStreetMap. The taller it stands, the longer the line Skiply expects right now.</p>
                {s.busy && <p className="muted small">Tallest right now: <b>{s.busy.p.name}</b>, about {fmtWait(s.busy.e.wait)}.</p>}
                <Link to={`/explore?cat=${s.cat}`} className="btn btn-line">See all {CATEGORIES[s.cat].label.toLowerCase()} →</Link>
              </article>
            )}
            {s.kind === 'all' && (
              <article className="story-card">
                <p className="kicker">The whole station</p>
                <h2 className="h2">Every light is a <em>real place.</em></h2>
                <p>Height is the estimated wait, colour is the platform. Drag to orbit, and tap any column to open its queue.</p>
                <div className="mapsec-legend">{CATEGORY_LIST.map((c) => <span key={c.key}><i style={{ background: c.color }} />{c.label}</span>)}</div>
                <Link to="/explore" className="btn btn-ink">Open all departures →</Link>
              </article>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
