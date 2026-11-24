import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { dayForecast, fmtWait } from '../../../lib/estimate';
import { fmtMin } from '../../../lib/hours';
import SplitFlap from '../../../ui/SplitFlap';
import Emblem from '../../../ui/Emblem';
import CountUp from '../../../ui/CountUp';
import Dial from './Dial';
import useQueueSim from './useQueueSim';

const WMO = (c) => (c === 0 ? ['Clear', '☀'] : c <= 3 ? ['Partly cloudy', '⛅'] : c <= 48 ? ['Fog', '🌫'] : c <= 57 ? ['Drizzle', '🌦'] : c <= 67 ? ['Rain', '🌧'] : c <= 77 ? ['Snow', '❄'] : c <= 82 ? ['Showers', '🌦'] : ['Thunderstorm', '⛈']);

function useWeather(lat, lng) {
  const [w, setW] = useState(null);
  useEffect(() => {
    let live = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto`)
      .then((r) => r.json()).then((j) => live && j.current && setW(j.current)).catch(() => {});
    return () => { live = false; };
  }, [lat, lng]);
  return w;
}

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0], [660, 0.22]].forEach(([f, t]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0, ctx.currentTime + t); g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.6);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.65);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch (e) { /* audio unavailable */ }
}

function speak(token, counter) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(`Token ${token.replace('-', ' ').split('').join(' ').replace(/ {3}/g, ' ')}, please proceed to counter ${counter}.`);
  const v = speechSynthesis.getVoices().find((x) => /en-IN/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
  if (v) u.voice = v;
  u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u);
}

const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function Ring({ k, size = 46 }) {
  const r = 19, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" className="ring" aria-hidden="true">
      <circle cx="23" cy="23" r={r} className="ring-bg" />
      <circle cx="23" cy="23" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, k))} transform="rotate(-90 23 23)" />
    </svg>
  );
}

function ForecastChart({ venue, history, simNow }) {
  const d = new Date(simNow);
  const data = useMemo(() => dayForecast(venue, d), [venue, d.getDate()]); // eslint-disable-line react-hooks/exhaustive-deps
  const W = 640, H = 170, max = Math.max(10, ...data.map((x) => x.wait), ...history.map((x) => x.v));
  const x = (h) => (h / 23) * W, y = (v) => H - 8 - (v / max) * (H - 24);
  const line = data.map((p, i) => `${i ? 'L' : 'M'}${x(p.hour)},${y(p.wait)}`).join(' ');
  const nowH = d.getHours() + d.getMinutes() / 60;
  const live = history.filter((p) => p.h <= 23.99).map((p, i) => `${i ? 'L' : 'M'}${x(p.h)},${y(p.v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="fchart" preserveAspectRatio="none" role="img" aria-label="Forecast wait versus live wait">
      <defs>
        <linearGradient id="fcA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A855F7" stopOpacity=".45" /><stop offset="1" stopColor="#A855F7" stopOpacity="0" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((k) => <line key={k} x1="0" x2={W} y1={8 + k * (H - 24)} y2={8 + k * (H - 24)} className="fc-grid" />)}
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#fcA)" className="fc-area" />
      <path d={line} className="fc-line" />
      {live && <path d={live} className="fc-live" />}
      <line x1={x(nowH)} x2={x(nowH)} y1="0" y2={H} className="fc-now" />
      <circle cx={x(nowH)} cy={y(history.length ? history[history.length - 1].v : 0)} r="5" className="fc-dot" />
      {[0, 6, 12, 18, 23].map((h) => <text key={h} x={Math.min(W - 24, x(h))} y={H + 14} className="fc-lbl">{fmtMin(h * 60).replace(':00', '')}</text>)}
    </svg>
  );
}

export default function Overview({ venue, onSwitch }) {
  const { tickets } = useApp();
  const sim = useQueueSim(venue, tickets);
  const weather = useWeather(venue.lat, venue.lng);
  const [tab, setTab] = useState('All');
  const [voice, setVoice] = useState(true);
  const [flash, setFlash] = useState(null);
  const [history, setHistory] = useState([]);
  const voiceRef = useRef(voice); voiceRef.current = voice;

  useEffect(() => sim.onCall((c) => {
    setFlash({ token: c.p.token, counter: c.counter, n: c.n });
    if (c.manual) { chime(); if (voiceRef.current) setTimeout(() => speak(c.p.token, c.counter), 700); }
  }), [sim.onCall]); // eslint-disable-line react-hooks/exhaustive-deps

  // sample the live wait once per simulated minute
  const lastSample = useRef(0);
  useEffect(() => {
    if (sim.simNow - lastSample.current < 60000 * Math.max(1, sim.speed / 10)) return;
    lastSample.current = sim.simNow;
    const d = new Date(sim.simNow);
    setHistory((h) => [...h, { h: d.getHours() + d.getMinutes() / 60, v: sim.waitNow ?? 0 }].slice(-240));
  }, [sim.simNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = new Date(sim.simNow);
  const hour = d.getHours();
  const greet = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const load = sim.open ? Math.min(1, sim.queue.length / (sim.open * 6)) : 1;
  const queue = tab === 'All' ? sim.queue : sim.queue.filter((p) => p.dept === tab);
  const lastServing = flash || (sim.counters.find((c) => c.serving) && { token: sim.counters.find((c) => c.serving).serving.token, counter: sim.counters.find((c) => c.serving).id });
  const wx = weather ? WMO(weather.weather_code) : null;

  return (
    <div className="ov">
      <header className="ov-head">
        <div>
          <p className="ov-kicker"><Emblem category={venue.category} size={14} /> {sim.cat.singular} · {venue.address || 'OpenStreetMap venue'}</p>
          <h1 className="ov-title">{greet}, <span>{venue.name}</span></h1>
        </div>
        <div className="ov-head-r">
          <div className="ov-clock">
            <b>{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</b>
            <span>{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}{sim.speed > 1 ? ` · ${sim.speed}× time-lapse` : ''}</span>
          </div>
          {wx && (
            <div className="ov-wx" title={`Open-Meteo · humidity ${weather.relative_humidity_2m}% · wind ${weather.wind_speed_10m} km/h`}>
              <span className="ov-wx-i">{wx[1]}</span>
              <span><b>{Math.round(weather.temperature_2m)}°</b><small>{wx[0]}</small></span>
            </div>
          )}
          <button className="ov-pill" onClick={onSwitch}>Switch venue</button>
        </div>
      </header>

      <div className="ov-bar">
        <div className="ov-tabs" role="tablist" aria-label="Departments">
          {['All', ...sim.cat.departments].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t}<span>{t === 'All' ? sim.queue.length : sim.queue.filter((p) => p.dept === t).length}</span>
            </button>
          ))}
        </div>
        <div className="ov-ctrls">
          <div className="ov-seg" role="group" aria-label="Simulation speed">
            {[1, 10, 60].map((s) => <button key={s} aria-pressed={sim.speed === s} onClick={() => sim.setSpeed(s)}>{s}×</button>)}
          </div>
          <button className="ov-icon" onClick={() => sim.setPaused(!sim.paused)} aria-label={sim.paused ? 'Resume' : 'Pause'}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">{sim.paused ? <path d="M8 5v14l11-7z" /> : <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>}</svg>
          </button>
          <button className={`ov-icon ${voice ? 'is-on' : ''}`} onClick={() => setVoice(!voice)} aria-label="Voice announcements" aria-pressed={voice} title="Voice announcements">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" />{voice ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m17 9 5 6M22 9l-5 6" />}</svg>
          </button>
        </div>
      </div>

      <div className="bento">
        {/* dial */}
        <section className="tile t-dial">
          <div className="tile-head"><span>Counters open</span><span className={`chip-live ${sim.paused ? 'off' : ''}`}>{sim.paused ? 'PAUSED' : 'LIVE'}</span></div>
          <Dial value={sim.open} max={sim.max} min={0} onChange={sim.setOpenCount} load={load} label="Counters open"
            big={sim.waitNow == null ? '—' : fmtWait(sim.waitNow)} sub={sim.open ? `est. wait · ${sim.queue.length} in line` : 'all counters closed'} />
          <div className="dial-steps">
            <button onClick={() => sim.setOpenCount(Math.max(0, sim.open - 1))} aria-label="Close a counter">−</button>
            <div className="dial-load"><span style={{ width: `${load * 100}%` }} /><em>{load < 0.5 ? 'Calm' : load < 0.85 ? 'Steady' : 'Overloaded'}</em></div>
            <button onClick={() => sim.setOpenCount(Math.min(sim.max, sim.open + 1))} aria-label="Open a counter">+</button>
          </div>
        </section>

        {/* now serving */}
        <section className="tile t-serve">
          <div className="tile-head"><span>Now serving</span><label className="tg"><input type="checkbox" checked={sim.auto} onChange={(e) => sim.setAuto(e.target.checked)} /><i /> Auto-call</label></div>
          <div className="serve-board">
            <SplitFlap text={lastServing ? lastServing.token : '-----'} size={5} className="serve-flap" stagger={50} />
            <div className="serve-to"><span>COUNTER</span><b>{lastServing ? lastServing.counter : '–'}</b></div>
          </div>
          <div className="serve-next">
            <span>Up next</span>
            {sim.queue.slice(0, 4).map((p) => <b key={p.token} className={p.source === 'app' ? 'is-app' : ''}>{p.token}</b>)}
            {!sim.queue.length && <em>Nobody waiting</em>}
          </div>
          <div className="serve-btns">
            <button className="call-btn" onClick={() => sim.callNext()} disabled={!sim.queue.length || !sim.open}>
              <span className="call-ring" /> Call next token
            </button>
            <button className="ov-pill" onClick={sim.addWalkIn}>+ Walk-in</button>
          </div>
        </section>

        {/* stats */}
        <section className="tile t-stat s1"><span className="st-l">In line</span><b className="st-n"><CountUp value={sim.queue.length} duration={500} /></b><span className="st-s">{queue.length !== sim.queue.length ? `${queue.length} in ${tab}` : `${sim.queue.filter((p) => p.source === 'app').length} via Skiply app`}</span></section>
        <section className="tile t-stat s2"><span className="st-l">Served today</span><b className="st-n"><CountUp value={sim.served} duration={500} /></b><span className="st-s">{sim.calls} called this session</span></section>
        <section className="tile t-stat s3"><span className="st-l">Avg. wait</span><b className="st-n">{sim.avgWait == null ? '—' : <><CountUp value={sim.avgWait} duration={500} /><small>m</small></>}</b><span className="st-s">across last {sim.waits.length} calls</span></section>
        <section className="tile t-stat s4"><span className="st-l">Service speed</span><b className="st-n">{(sim.open * 60 / sim.cat.service).toFixed(0)}<small>/h</small></b><span className="st-s">{sim.cat.service} min per person</span></section>

        {/* counters */}
        <section className="tile t-counters">
          <div className="tile-head"><span>Counters</span><span className="muted-s">tap a switch to open or close · tap a card to call next there</span></div>
          <div className="counters">
            {sim.counters.map((c) => {
              const el = c.serving ? sim.simNow - c.start : 0;
              return (
                <div key={c.id} className={`ctr ${c.on ? 'is-on' : ''} ${c.serving ? 'is-busy' : ''}`}>
                  <div className="ctr-top">
                    <span className="ctr-n">C{c.id}</span>
                    <label className="tg sm" aria-label={`Counter ${c.id}`}><input type="checkbox" checked={c.on} onChange={() => sim.toggle(c.id)} /><i /></label>
                  </div>
                  <button className="ctr-body" disabled={!c.on || !sim.queue.length} onClick={() => sim.callNext(c.id)}>
                    {c.on ? (
                      <>
                        <Ring k={c.serving ? el / c.dur : 0} />
                        <span className="ctr-t"><b>{c.serving ? c.serving.token : 'Free'}</b><span>{c.serving ? mmss(el) : sim.queue.length ? 'Tap to call' : 'Idle'}</span></span>
                      </>
                    ) : <span className="ctr-off">Closed</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* queue */}
        <section className="tile t-queue">
          <div className="tile-head"><span>Queue · {tab}</span><span className="muted-s">{queue.length}</span></div>
          <ol className="q">
            {queue.slice(0, 14).map((p, i) => (
              <li key={p.token + p.joined} className={p.source === 'app' ? 'is-app' : ''} style={{ '--i': i }}>
                <span className="q-pos">{i + 1}</span>
                <span className="q-t"><b>{p.token}</b><span>{p.dept}{p.name ? ` · ${p.name}` : ''}</span></span>
                <span className="q-w">{p.source === 'app' ? <em>APP</em> : null}{mmss(sim.simNow - p.joined)}</span>
              </li>
            ))}
            {!queue.length && <li className="q-empty">No one waiting{tab !== 'All' ? ` for ${tab}` : ''}.</li>}
          </ol>
        </section>

        {/* forecast */}
        <section className="tile t-chart">
          <div className="tile-head"><span>Wait today</span><span className="legend"><i className="lg-f" />Skiply forecast <i className="lg-l" />Live</span></div>
          <ForecastChart venue={venue} history={history} simNow={sim.simNow} />
        </section>

        {/* activity */}
        <section className="tile t-log">
          <div className="tile-head"><span>Activity</span></div>
          <ul className="log">
            {sim.log.slice(0, 9).map((e) => (
              <li key={e.id} className={`lg-${e.kind}`}><i /><span>{e.text}</span><time>{new Date(e.t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</time></li>
            ))}
            {!sim.log.length && <li className="lg-sys"><i /><span>Waiting for the first arrival…</span></li>}
          </ul>
        </section>
      </div>

      <p className="ov-foot">
        <b>Simulation.</b> This dashboard runs on Skiply's demand model for {venue.name} (a real venue from OpenStreetMap) until your counter is connected.
        Tokens booked in the Skiply app on this device appear as <em>APP</em>. <Link to={`/place/${venue.id}`}>See your public page →</Link>
      </p>
    </div>
  );
}
