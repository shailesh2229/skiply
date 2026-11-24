import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNearby, useNow, useReveal } from '../lib/hooks';
import { CATEGORY_LIST } from '../data/categories';
import { CITIES } from '../data/cities';
import { estimateAt, fmtWait } from '../lib/estimate';
import Board from '../ui/Board';
import Emblem from '../ui/Emblem';
import GrandHall from '../ui/GrandHall';
import Ticker from '../ui/Ticker';
import CountUp from '../ui/CountUp';
import LeavePlanner from '../ui/LeavePlanner';
import TearTicket from '../ui/TearTicket';
import CityStory from '../ui/CityStory';
import { hasWebGL } from '../lib/webgl';
import '../styles/home.css';

const pickCity = () => window.dispatchEvent(new Event('skiply:pick-city'));

function TiltSign({ c, count, loading, i }) {
  const ref = useRef(null);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--rx', `${-y * 14}deg`);
    ref.current.style.setProperty('--ry', `${x * 18}deg`);
    ref.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const leave = () => { ['--rx', '--ry'].forEach((v) => ref.current.style.setProperty(v, '0deg')); };
  return (
    <Link ref={ref} to={`/explore?cat=${c.key}`} className="sign" style={{ '--c': c.color, transitionDelay: `${i * 40}ms` }}
      onMouseMove={move} onMouseLeave={leave} data-reveal>
      <span className="sign-bolt" /><span className="sign-bolt" /><span className="sign-bolt" /><span className="sign-bolt" />
      <span className="sign-no">{c.platform}</span>
      <span className="sign-body">
        <span className="sign-ico"><Emblem category={c.key} size={22} /></span>
        <span className="sign-name">{c.label}</span>
        <span className="sign-count mono">{loading && count == null ? 'COUNTING…' : `${count || 0} NEARBY →`}</span>
      </span>
      <span className="sign-shine" />
    </Link>
  );
}

export default function Home() {
  const { location, locate, locating, setLocation } = useApp();
  const { places, loading, error } = useNearby(location);
  const now = useNow(30000);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  useReveal();

  const d = new Date(now);
  const withEst = useMemo(() => places.map((p) => ({ p, e: estimateAt(p, d) })), [places, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = useMemo(() => withEst.filter((x) => x.e.status.open !== false), [withEst]);
  const counts = useMemo(() => places.reduce((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {}), [places]);
  const avgWait = open.length ? Math.round(open.reduce((s, x) => s + x.e.wait, 0) / open.length) : 0;
  const walkIns = open.filter((x) => x.e.wait <= 10).length;
  const quickest = useMemo(() => [...open].filter((x) => x.p.distance < 2.5).sort((a, b) => a.e.wait - b.e.wait || a.p.distance - b.p.distance).slice(0, 5), [open]);
  const openPlaces = useMemo(() => open.map((x) => x.p), [open]);
  const openId = useCallback((id) => navigate(`/place/${id}`), [navigate]);
  const [webgl] = useState(() => hasWebGL());

  const submit = (e) => { e.preventDefault(); navigate(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };
  const others = ['Mumbai', 'Bengaluru', 'Delhi', 'Ahmedabad'].filter((c) => c !== location.name).slice(0, 3);

  return (
    <main className="home2">
      {/* ── 1. Hero: a real 3D city (Grand Hall fallback) ── */}
      {webgl ? (
        <>
          <CityStory location={location} places={places} now={now} loading={loading} onSelect={openId} heroExtras={<>
        <p className="gh-sub">
          Live queue estimates for <b>{places.length || 'every'}</b> real hospitals, banks, clinics,
          salons and more around <button className="gh-city" onClick={pickCity}>{location.name} ▾</button>
        </p>
        <form className="gh-search" onSubmit={submit} role="search">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Apollo, SBI, dentist, haircut…" aria-label="Search venues" />
          <button className="gh-go" type="submit">Find a queue <span aria-hidden="true">→</span></button>
        </form>
        <div className="gh-meta">
          <button onClick={() => locate().catch(() => pickCity())} disabled={locating} className="gh-loc">
            <span className="gh-loc-dot" /> {locating ? 'Finding you…' : 'Use my exact location'}
          </button>
          <span className="gh-or">or jump to</span>
          {others.map((c) => <button key={c} className="gh-chip" onClick={() => setLocation({ ...CITIES.find((x) => x.name === c), source: 'city' })}>{c}</button>)}
        </div>
</>} />
          <div className="gh gh-strip"><Ticker places={openPlaces.length ? openPlaces : places} now={now} /></div>
        </>
      ) : (
        <GrandHall ticker={<Ticker places={openPlaces.length ? openPlaces : places} now={now} />}>
        <p className="gh-sub">
          Live queue estimates for <b>{places.length || 'every'}</b> real hospitals, banks, clinics,
          salons and more around <button className="gh-city" onClick={pickCity}>{location.name} ▾</button>
        </p>
        <form className="gh-search" onSubmit={submit} role="search">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Apollo, SBI, dentist, haircut…" aria-label="Search venues" />
          <button className="gh-go" type="submit">Find a queue <span aria-hidden="true">→</span></button>
        </form>
        <div className="gh-meta">
          <button onClick={() => locate().catch(() => pickCity())} disabled={locating} className="gh-loc">
            <span className="gh-loc-dot" /> {locating ? 'Finding you…' : 'Use my exact location'}
          </button>
          <span className="gh-or">or jump to</span>
          {others.map((c) => <button key={c} className="gh-chip" onClick={() => setLocation({ ...CITIES.find((x) => x.name === c), source: 'city' })}>{c}</button>)}
        </div>
      </GrandHall>
      )}

      {/* ── 2. Numbers ───────────────────────────── */}
      <section className="stats">
        <div className="wrap stats-in">
          {[
            [places.length, '', 'real venues mapped within 3 km'],
            [open.length, '', 'likely open right now'],
            [walkIns, '', 'with a wait under 10 minutes'],
            [avgWait, ' min', 'average estimated wait'],
          ].map(([v, s, l], i) => (
            <div key={l} className="stat" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="stat-n display">{loading && !places.length ? '—' : <CountUp value={v} suffix={s} />}</span>
              <span className="stat-l">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Departures ────────────────────────── */}
      <section className="sec2 board2">
        <div className="wrap">
          <header className="head2" data-reveal>
            <p className="kicker">Live from {location.name}</p>
            <h2 className="h2">The departure board <em>for queues.</em></h2>
          </header>
          <div data-reveal><Board places={openPlaces.length ? openPlaces : places} loading={loading} cityName={location.name} now={now} /></div>
          {error && !places.length && (
            <div className="notice"><b>OpenStreetMap didn’t answer.</b> The public servers can be busy, so try again in a moment.
              <button className="btn btn-line btn-sm" onClick={() => window.location.reload()}>Retry</button></div>
          )}
          {quickest.length > 0 && (
            <div className="quick" data-reveal>
              <span className="mono quick-l">SHORTEST RIGHT NOW</span>
              {quickest.map(({ p, e }) => (
                <Link key={p.id} to={`/place/${p.id}`} state={{ place: p }} className="quick-i">
                  <Emblem category={p.category} size={16} />
                  <span className="quick-n">{p.name}</span>
                  <b className="mono">{fmtWait(e.wait)}</b>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Planner ───────────────────────────── */}
      <section className="sec2 plan2">
        <div className="wrap">
          <header className="head2" data-reveal>
            <p className="kicker">Try it with a real place near you</p>
            <h2 className="h2">When should you <em>leave home?</em></h2>
            <p className="lede">Drag through the next twelve hours and watch the line grow and shrink. Skiply picks the calmest moment and works backwards from your travel time.</p>
          </header>
          <div data-reveal><LeavePlanner places={places} now={now} /></div>
        </div>
      </section>

      {/* ── 5. Platforms ─────────────────────────── */}
      <section className="sec2 signs2">
        <div className="wrap">
          <header className="head2" data-reveal>
            <p className="kicker">Seven platforms</p>
            <h2 className="h2">Where are you <em>headed?</em></h2>
          </header>
          <div className="signs">
            {CATEGORY_LIST.map((c, i) => <TiltSign key={c.key} c={c} i={i} count={counts[c.key]} loading={loading} />)}
            <Link to="/explore" className="sign sign-all" data-reveal>
              <span className="sign-body"><span className="sign-name">All departures</span><span className="sign-count mono">LIST + MAP →</span></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Ticket ────────────────────────────── */}
      <section className="sec2 tear2">
        <div className="wrap tear2-in">
          <div data-reveal>
            <p className="kicker">The whole journey</p>
            <h2 className="h2">Three stops.<br /><em>Zero standing.</em></h2>
            <ol className="stops">
              <li><b>Look up the board.</b> See roughly how many people are waiting before you leave.</li>
              <li><b>Take a token.</b> Join now, or book a quiet slot up to a week ahead.</li>
              <li><b>Arrive on cue.</b> Your ticket counts down the people ahead of you.</li>
            </ol>
          </div>
          <div data-reveal><TearTicket city={location.name} /></div>
        </div>
      </section>

      {/* ── 8. Honesty ───────────────────────────── */}
      <section className="sec2">
        <div className="wrap ledger" data-reveal>
          <div>
            <p className="kicker">The fine print, in large print</p>
            <h2 className="h2">Real places. <em>Honest</em> numbers.</h2>
          </div>
          <div className="ledger-cols">
            <p><b>Every venue is real.</b> Names, addresses, phones and hours come from OpenStreetMap, the volunteer-built map of the world. Nothing on the board is made up.</p>
            <p><b>Waits are estimates, and labelled that way.</b> Until a venue connects its counter, we model the line from its type, the hour, the day and its hours. <Link to="/about#estimates" className="link-u">See the formula.</Link></p>
            <p><b>Your tickets stay on your device.</b> No sign-up and no tracking. Tokens live in your browser.</p>
          </div>
        </div>
      </section>

      {/* ── 9. Business ──────────────────────────── */}
      <section className="biz-cta">
        <div className="wrap biz-cta-in">
          <p className="kicker">For hospitals, banks, salons &amp; everyone with a counter</p>
          <h2 className="display biz-cta-title">Put your queue<br />on the <em>board.</em></h2>
          <p className="lede">Replace our estimate with your real line. Call tokens, manage departments, see peak hours and cut crowding at the counter.</p>
          <div className="biz-cta-row">
            <Link to="/business-panel" className="btn btn-ink">Open the business panel →</Link>
            <Link to="/contact?topic=business" className="btn btn-line">Talk to us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
