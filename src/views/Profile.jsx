import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { useReveal } from '../lib/hooks';
import { load } from '../lib/storage';
import { burst, toast } from '../lib/fx';
import { PALETTES } from '../data/palettes';
import Emblem from '../ui/Emblem';
import BrandMark from '../ui/BrandMark';
import CountUp from '../ui/CountUp';
import '../styles/mine.css';

const LEVELS = [
  [0, 'Platform Visitor'], [1, 'Commuter'], [4, 'Regular'], [8, 'Express Class'], [15, 'Season Pass'], [30, 'Platinum Rail'],
];

function achievements({ tickets, favorites, reports, secret, palette }) {
  const live = tickets.filter((t) => !t.cancelled);
  const hours = live.map((t) => new Date(t.slot || t.createdAt).getHours());
  const cats = new Set(live.map((t) => t.category));
  const byDay = live.reduce((a, t) => { const k = new Date(t.createdAt).toDateString(); a[k] = (a[k] || 0) + 1; return a; }, {});
  const reportCount = Object.values(reports).reduce((s, r) => s + r.length, 0);
  return [
    ['First token', 'Take your first token', live.length >= 1],
    ['Early bird', 'A token before 9 AM', hours.some((h) => h < 9)],
    ['Night owl', 'A token after 9 PM', hours.some((h) => h >= 21)],
    ['Platform hopper', 'Tokens on 3 different platforms', cats.size >= 3],
    ['Grand tour', 'Tokens on all 7 platforms', cats.size >= 7],
    ['Errand runner', '3 tokens in a single day', Object.values(byDay).some((n) => n >= 3)],
    ['Collector', 'Save 5 stations', favorites.length >= 5],
    ['Line reporter', 'Report a line for other passengers', reportCount >= 1],
    ['Station master', 'Report 10 lines', reportCount >= 10],
    ['Night shift', 'Switch Skiply to the Night look', palette === 'midnight'],
    ['Secret platform', 'Find the hidden rush-hour code', secret],
  ];
}

function Stamp({ cat, count, i }) {
  const c = CATEGORIES[cat];
  const on = count > 0;
  return (
    <div className={`stamp ${on ? 'is-on' : ''}`} style={{ '--c': c.color, '--rot': `${((i * 37) % 24) - 12}deg` }} title={`${c.label}: ${count}`}>
      <svg viewBox="0 0 100 100" className="stamp-ring" aria-hidden="true">
        <defs><path id={`arc-${cat}`} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></defs>
        <circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="28" />
        <text><textPath href={`#arc-${cat}`} startOffset="0">{`PLATFORM ${c.platform} · ${c.singular.toUpperCase()} · SKIPLY · `}</textPath></text>
      </svg>
      <span className="stamp-ico"><Emblem category={cat} size={22} /></span>
      {on && <span className="stamp-n mono">×{count}</span>}
    </div>
  );
}

export default function Profile() {
  const { passenger, setPassenger, tickets, location, favorites, reports, resolvedPalette } = useApp();
  const [name, setName] = useState(passenger.name);
  const [phone, setPhone] = useState(passenger.phone);
  const [flip, setFlip] = useState(false);
  const card = useRef(null);
  useReveal();

  const live = tickets.filter((t) => !t.cancelled);
  const byCat = live.reduce((a, t) => ({ ...a, [t.category]: (a[t.category] || 0) + 1 }), {});
  const saved = Math.round(live.reduce((s, t) => s + (t.mode === 'live' ? t.ahead * t.perPerson : CATEGORIES[t.category]?.service * 2 || 0), 0));
  const level = [...LEVELS].reverse().find(([n]) => live.length >= n);
  const next = LEVELS.find(([n]) => n > live.length);
  const secret = !!load('skiply.secret', false);
  const ach = useMemo(() => achievements({ tickets, favorites, reports, secret, palette: resolvedPalette }), [tickets, favorites, reports, secret, resolvedPalette]);
  const got = ach.filter((a) => a[2]).length;
  const memberNo = useMemo(() => `SKP-${(passenger.name || 'guest').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 999983, 7).toString().padStart(6, '0')}`, [passenger.name]);

  const tilt = (e) => {
    const r = card.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    card.current.style.setProperty('--rx', `${-y * 10}deg`); card.current.style.setProperty('--ry', `${x * 14}deg`);
    card.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`); card.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const untilt = () => { card.current.style.setProperty('--rx', '0deg'); card.current.style.setProperty('--ry', '0deg'); };

  const save = (e) => {
    e.preventDefault();
    setPassenger({ name: name.trim(), phone: phone.trim() });
    const r = e.currentTarget.querySelector('button[type=submit]').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top);
    toast({ tone: 'go', title: 'Passport updated', body: 'Your details will pre-fill every token.' });
  };
  const wipe = () => {
    if (!window.confirm('Erase every Skiply ticket, saved station, report and setting stored in this browser? This cannot be undone.')) return;
    Object.keys(localStorage).filter((k) => k.startsWith('skiply.')).forEach((k) => localStorage.removeItem(k));
    window.location.href = '/';
  };

  return (
    <main className="passport">
      <div className="wrap">
        <header className="pp-head" data-reveal>
          <p className="kicker">Passenger passport · stored only on this device</p>
          <h1 className="h1">{passenger.name ? <>Welcome aboard, <em>{passenger.name.split(' ')[0]}.</em></> : <>Your Skiply <em>passport.</em></>}</h1>
        </header>

        <section className="pp-top">
          <div className={`pcard3d ${flip ? 'is-flip' : ''}`} ref={card} onMouseMove={tilt} onMouseLeave={untilt}
            onClick={() => setFlip((f) => !f)} role="button" tabIndex={0} aria-label="Passenger card, click to flip" data-cursor="FLIP"
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFlip((f) => !f))}>
            <div className="pc-face pc-front">
              <span className="pc-holo" aria-hidden="true" />
              <div className="pc-row"><span className="brand-word pc-brand"><BrandMark size={26} /> SKIPLY</span><span className="mono pc-tier">{level[1].toUpperCase()}</span></div>
              <div className="pc-chip" aria-hidden="true"><i /><i /><i /><i /></div>
              <p className="pc-name display">{passenger.name || 'Unnamed traveller'}</p>
              <div className="pc-row mono pc-meta">
                <span>HOME STATION<b>{location.name}</b></span>
                <span>TOKENS<b>{live.length}</b></span>
                <span>MEMBER<b>{memberNo}</b></span>
              </div>
            </div>
            <div className="pc-face pc-back">
              <div className="pc-stripe" aria-hidden="true" />
              <p className="mono pc-back-t">THIS CARD LIVES IN YOUR BROWSER. NO ACCOUNT, NO SERVER, NO TRACKING.</p>
              <div className="pc-row mono pc-meta">
                <span>LIVERY<b>{PALETTES[resolvedPalette].label}</b></span>
                <span>SAVED<b>{favorites.length}</b></span>
                <span>BADGES<b>{got}/{ach.length}</b></span>
              </div>
            </div>
          </div>

          <div className="pp-stats">
            <div className="pp-stat" data-reveal><span className="display"><CountUp value={saved} /></span><span className="mono">MINUTES OF STANDING SKIPPED</span></div>
            <div className="pp-stat" data-reveal><span className="display"><CountUp value={live.length} /></span><span className="mono">TOKENS TAKEN</span></div>
            <div className="pp-stat" data-reveal><span className="display"><CountUp value={got} /></span><span className="mono">BADGES EARNED</span></div>
            <div className="pp-level" data-reveal>
              <span className="mono">{next ? `${next[0] - live.length} MORE TOKEN${next[0] - live.length === 1 ? '' : 'S'} TO ${next[1].toUpperCase()}` : 'TOP TIER REACHED'}</span>
              <span className="pp-bar"><i style={{ width: `${next ? (live.length / next[0]) * 100 : 100}%` }} /></span>
            </div>
          </div>
        </section>

        <section className="pp-sec" data-reveal>
          <div className="pp-sec-h"><p className="kicker">Visa stamps</p><h2 className="h2">Platforms you’ve <em>passed through.</em></h2></div>
          <div className="stamps">{CATEGORY_LIST.map((c, i) => <Stamp key={c.key} cat={c.key} count={byCat[c.key] || 0} i={i} />)}</div>
        </section>

        <section className="pp-sec" data-reveal>
          <div className="pp-sec-h"><p className="kicker">Badges · {got} of {ach.length}</p><h2 className="h2">Small <em>victories.</em></h2></div>
          <div className="badges">
            {ach.map(([t, d, ok], i) => (
              <div key={t} className={`bdg ${ok ? 'is-on' : ''}`}>
                <span className="bdg-ico" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span><b>{t}</b><span className="muted">{d}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className="pp-sec pp-form" data-reveal>
          <form className="booking" onSubmit={save}>
            <p className="kicker">Passenger details</p>
            <h2 className="h3">Pre-fills every token you take</h2>
            <div className="field"><label htmlFor="p-name">Name</label><input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div className="field"><label htmlFor="p-phone">Mobile</label><input id="p-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" /></div>
            <button className="btn btn-ink" type="submit">Save details</button>
          </form>
          <div className="pp-privacy">
            <p className="kicker">Your data</p>
            <p>Tickets, saved stations, line reports and settings live in this browser’s local storage. Nothing is uploaded.</p>
            <div className="saved-cta-row">
              <Link to="/tickets" className="btn btn-line btn-sm">My tickets</Link>
              <Link to="/saved" className="btn btn-line btn-sm">Saved stations</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={wipe}>Erase my Skiply data</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
