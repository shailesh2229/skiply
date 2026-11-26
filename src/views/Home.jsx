import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNearby, useNow, useReveal } from '../lib/hooks';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { estimateAt, fmtWait } from '../lib/estimate';
import { fmtKm } from '../lib/geo';
import { photo, photoSet } from '../data/photos';
import VenuePhoto from '../ui/VenuePhoto';
import PlaceMap from '../ui/PlaceMap';
import VoiceButton from '../ui/VoiceButton';
import '../styles/home.css';

const pickCity = () => window.dispatchEvent(new Event('skiply:pick-city'));
const SHORT = { hospital: 'Hospitals', clinic: 'Clinics', bank: 'Banks', salon: 'Salons', restaurant: 'Restaurants', pharmacy: 'Pharmacies', post_office: 'Post offices' };

function Photo({ k, alt = '', sizes = '100vw', className = '', eager = false, widths }) {
  return (
    <img className={className} src={photo(k, 1200)} srcSet={photoSet(k, widths)} sizes={sizes} alt={alt}
      loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'auto'} />
  );
}

const Arrow = () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>;

export default function Home() {
  const { location, locate, locating } = useApp();
  const { places, loading, error } = useNearby(location);
  const now = useNow(30000);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const hero = useRef(null);
  useReveal();

  // Nav sits over the photo: give it the dark treatment while the hero is underneath.
  useEffect(() => {
    const io = new IntersectionObserver(([en]) => document.body.classList.toggle('nav-dark', en.isIntersecting), { rootMargin: '-20px 0px -92% 0px' });
    io.observe(hero.current);
    return () => { io.disconnect(); document.body.classList.remove('nav-dark'); };
  }, []);

  const rows = useMemo(() => {
    const d = new Date(now);
    return places.map((p) => ({ p, e: estimateAt(p, d) }));
  }, [places, now]);
  const open = useMemo(() => rows.filter((x) => x.e.status.open !== false), [rows]);
  const shortest = open.length ? Math.min(...open.map((x) => x.e.wait)) : null;
  const byCat = useMemo(() => {
    const m = {};
    rows.forEach(({ p, e }) => {
      const c = (m[p.category] ||= { n: 0, open: 0, min: null });
      c.n += 1;
      if (e.status.open !== false) { c.open += 1; c.min = c.min == null ? e.wait : Math.min(c.min, e.wait); }
    });
    return m;
  }, [rows]);
  const best = useMemo(() => [...open].filter((x) => x.p.distance < 3)
    .sort((a, b) => a.e.wait - b.e.wait || a.p.distance - b.p.distance).slice(0, 6), [open]);
  const avg = open.length ? Math.round(open.reduce((s, x) => s + x.e.wait, 0) / open.length) : 0;
  const mapPlaces = useMemo(() => open.slice(0, 150).map((x) => x.p), [open]);
  const openPlace = (p) => navigate(`/place/${p.id}`, { state: { place: p } });
  const you = useMemo(() => (location.source === 'gps' ? location : null), [location]);

  const submit = (e) => { e.preventDefault(); navigate(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };
  const ready = !loading || places.length > 0;

  return (
    <main className="ph">
      {/* ── Hero ───────────────────────────────── */}
      <section className="ph-hero" ref={hero}>
        <Photo k="hero" eager className="ph-hero-img" widths={[640, 1024, 1600, 2400]} alt="" />
        <div className="ph-hero-scrim" aria-hidden="true" />
        <div className="wrap ph-hero-in">
          <button className="ph-loc" onClick={pickCity}>
            <span className="ph-dot" /> Live near <b>{location.name}</b>
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
          <h1 className="ph-title">Skip the line.<br /><span>Not your day.</span></h1>
          <p className="ph-sub">See how long the queue is at hospitals, banks, clinics and salons near you. Take a token, and walk in when it’s your turn.</p>

          <form className="ph-search" onSubmit={submit} role="search">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a hospital, bank, doctor or salon" aria-label="Search places" />
            <VoiceButton onResult={(t, fin) => { setQ(t); if (fin && t) navigate(`/explore?q=${encodeURIComponent(t)}`); }} />
            <button className="ph-go" type="submit">Find a queue</button>
          </form>

          <div className="ph-cats">
            {CATEGORY_LIST.map((c) => <Link key={c.key} to={`/explore?cat=${c.key}`} className="ph-cat">{SHORT[c.key]}</Link>)}
            <button className="ph-cat ph-cat-loc" onClick={() => locate().catch(pickCity)} disabled={locating}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
              {locating ? 'Finding you…' : 'Use my location'}
            </button>
          </div>
        </div>
        <div className="wrap ph-hero-foot mono">
          {ready ? (
            <>
              <span><b>{places.length}</b> places nearby</span>
              <span><b>{open.length}</b> open now</span>
              {shortest != null && <span>shortest wait <b>{fmtWait(shortest)}</b></span>}
            </>
          ) : <span>Checking places near {location.name}…</span>}
          <span className="ph-credit">Photo · Unsplash</span>
        </div>
      </section>

      {/* ── Browse by place ───────────────────── */}
      <section className="ph-sec">
        <div className="wrap">
          <header className="ph-head" data-reveal>
            <h2 className="ph-h2">Where are you going <span>today?</span></h2>
            <Link to="/explore" className="ph-more">All places <Arrow /></Link>
          </header>
          <div className="ph-grid">
            {CATEGORY_LIST.map((c, i) => {
              const s = byCat[c.key];
              return (
                <Link key={c.key} to={`/explore?cat=${c.key}`} className={`ph-card ${i === 0 ? 'is-wide' : ''}`} data-reveal style={{ transitionDelay: `${i * 40}ms` }}>
                  <span className="ph-card-img"><Photo k={c.key} sizes="(max-width: 700px) 70vw, 400px" widths={[400, 800, 1200]} alt={c.label} /></span>
                  <span className="ph-card-t">{c.label}</span>
                  <span className="ph-card-s">
                    {!ready ? 'Loading…' : s ? `${s.n} nearby${s.min != null ? ` · from ${fmtWait(s.min).replace('No wait', '0 min')}` : ' · closed now'}` : 'None nearby'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Shortest lines ────────────────────── */}
      <section className="ph-sec ph-sec-tint">
        <div className="wrap ph-short">
          <div className="ph-short-l" data-reveal>
            <p className="ph-k">Right now</p>
            <h2 className="ph-h2">The shortest lines <span>near you.</span></h2>
            <p className="ph-p">Updated every few minutes from real places on the map. Tap one to take a token.</p>
            <Link to="/explore" className="ph-btn ph-btn-dark">See all near you <Arrow /></Link>
          </div>
          <ol className="ph-list" data-reveal>
            {!best.length && Array.from({ length: 5 }, (_, i) => <li key={i} className="ph-row is-skel"><span className="skeleton" /><span className="skeleton" /></li>)}
            {best.map(({ p, e }) => (
              <li key={p.id}>
                <Link to={`/place/${p.id}`} state={{ place: p }} className="ph-row">
                  <span className="ph-thumb"><VenuePhoto place={p} width={96} /></span>
                  <span className="ph-row-t">
                    <b>{p.name}</b>
                    <span><i className="ph-dot ph-dot-go" />{CATEGORIES[p.category].singular} · {fmtKm(p.distance)}</span>
                  </span>
                  <span className="ph-wait mono">{e.wait <= 0 ? 'Walk in' : fmtWait(e.wait)}</span>
                </Link>
              </li>
            ))}
            {error && !places.length && <li className="ph-row ph-err">OpenStreetMap isn’t answering right now. Try again in a minute.</li>}
          </ol>
        </div>
      </section>

      {/* ── The problem ───────────────────────── */}
      <section className="ph-sec">
        <div className="wrap ph-split">
          <div className="ph-split-img" data-reveal><Photo k="waiting" sizes="(max-width: 900px) 100vw, 600px" alt="People waiting in a hospital corridor" /></div>
          <div className="ph-split-t" data-reveal>
            <p className="ph-k">Why Skiply</p>
            <h2 className="ph-h2">Most of the waiting <span>isn’t needed.</span></h2>
            <p className="ph-p">It happens because nobody can see the line before they leave home. Skiply shows it to you, place by place, hour by hour.</p>
            <dl className="ph-nums">
              <div><dt>{ready ? places.length : '—'}</dt><dd>real places near {location.name}</dd></div>
              <div><dt>{ready ? `${avg}m` : '—'}</dt><dd>average wait right now</dd></div>
              <div><dt>₹0</dt><dd>to use, no sign-up</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────── */}
      <section className="ph-sec ph-how">
        <div className="wrap ph-how-in">
          <div data-reveal>
            <p className="ph-k">How it works</p>
            <h2 className="ph-h2">Three taps. <span>Zero standing.</span></h2>
            <ol className="ph-steps">
              <li><b>Look up the line</b><span>Find the place and see roughly how many people are waiting.</span></li>
              <li><b>Take a token</b><span>Join now, or book a quiet time slot up to a week ahead.</span></li>
              <li><b>Arrive on time</b><span>Your token counts down and tells you when to leave.</span></li>
            </ol>
          </div>
          <div className="ph-phone-wrap" data-reveal>
            <div className="ph-phone" aria-hidden="true">
              <span className="ph-notch" />
              <div className="ph-screen">
                <p className="ph-s-k">YOUR TOKEN</p>
                <p className="ph-s-tok">H-051</p>
                <p className="ph-s-v">{best[0]?.p.name || 'City Hospital'}</p>
                <div className="ph-s-big"><b>6</b><span>people ahead</span></div>
                <span className="ph-s-bar"><i /></span>
                <div className="ph-s-row"><span>Your turn</span><b>~ 11:40 AM</b></div>
                <div className="ph-s-row"><span>Leave home by</span><b>11:22 AM</b></div>
                <span className="ph-s-btn">Get directions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Map ───────────────────────────────── */}
      <section className="ph-sec ph-sec-top0">
        <div className="wrap">
          <header className="ph-head" data-reveal>
            <h2 className="ph-h2">Every queue, <span>on one map.</span></h2>
          </header>
          <div className="ph-map" data-reveal>
            <PlaceMap center={location} places={mapPlaces} you={you} onSelect={openPlace} zoom={14} className="ph-map-in" />
            <Link to="/explore" className="ph-map-card">
              <span><b>{open.length || '—'} places open</b><span>near {location.name}</span></span>
              <span className="ph-btn ph-btn-dark ph-btn-sm">Open the full map <Arrow /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Business ──────────────────────────── */}
      <section className="ph-biz">
        <Photo k="clinic" className="ph-biz-img" sizes="100vw" alt="" />
        <div className="ph-biz-scrim" aria-hidden="true" />
        <div className="wrap ph-biz-in">
          <p className="ph-k ph-k-light">For hospitals, banks, clinics and salons</p>
          <h2 className="ph-h2 ph-h2-light">Run a calmer counter.</h2>
          <p className="ph-p ph-p-light">Call tokens, show a “Now serving” screen, and see your busy hours. Free to start.</p>
          <div className="ph-biz-row">
            <Link to="/business-panel" className="ph-btn ph-btn-light">Open the business panel <Arrow /></Link>
            <Link to="/contact?topic=business" className="ph-btn ph-btn-ghost">Talk to us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
