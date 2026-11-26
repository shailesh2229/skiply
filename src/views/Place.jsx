import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNow } from '../lib/hooks';
import { CATEGORIES } from '../data/categories';
import { cachedPlace, fetchPlace } from '../services/places';
import { dayForecast, estimateAt, fmtWait, hoursFor } from '../lib/estimate';
import { DAY_NAMES, fmtMin, rangesForDate } from '../lib/hours';
import { distanceKm, fmtKm } from '../lib/geo';
import { createTicket } from '../lib/tickets';
import Emblem from '../ui/Emblem';
import VenuePhoto from '../ui/VenuePhoto';
import PlaceMap from '../ui/PlaceMap';
import Ticket from '../ui/Ticket';
import { crowdLevel, usePlaceActions, HeartIcon, CompareIcon } from '../ui/PlaceCard';
import { blendEstimate, bucketLabel, freshReports, REPORT_BUCKETS } from '../lib/reports';
import { toast, chime, burst } from '../lib/fx';
import '../styles/tickets2.css';

export default function Place() {
  const { pid } = useParams();
  const routeState = useLocation().state;
  const [place, setPlace] = useState(() => routeState?.place || cachedPlace(pid));
  const [status, setStatus] = useState(place ? 'ok' : 'loading');
  const { location, reports } = useApp();
  const now = useNow(30000);

  useEffect(() => {
    let live = true;
    const start = routeState?.place || cachedPlace(pid);
    setPlace(start); setStatus(start ? 'ok' : 'loading');
    fetchPlace(pid)
      .then((p) => { if (!live) return; if (p) { setPlace((prev) => ({ ...prev, ...strip(p) })); setStatus('ok'); } else if (!start) setStatus('missing'); })
      .catch(() => live && !start && setStatus('error'));
    window.scrollTo(0, 0);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  if (status === 'loading') return <main className="wrap place-loading"><p className="mono">LOOKING UP VENUE ON OPENSTREETMAP…</p><div className="skeleton" style={{ height: 80, width: '60%' }} /></main>;
  if (!place) {
    return (
      <main className="wrap empty empty-page">
        <p className="display empty-t">Wrong platform.</p>
        <p className="muted">{status === 'error' ? 'OpenStreetMap could not be reached. Try again in a moment.' : 'This venue does not exist on OpenStreetMap, or it isn’t a type Skiply supports yet.'}</p>
        <Link to="/explore" className="btn btn-ink">Back to departures</Link>
      </main>
    );
  }

  const cat = CATEGORIES[place.category];
  const placeReports = reports[place.id] || [];
  // Date.now(), not the 30s tick, so a report filed a moment ago counts immediately.
  const est = blendEstimate(estimateAt(place, new Date(now)), placeReports, Date.now());
  const dist = location ? distanceKm(location, place) : null;
  return (
    <main className="place">
      <div className="wrap">
        <nav className="crumbs mono" aria-label="Breadcrumb">
          <Link to="/">Skiply</Link> / <Link to={`/explore?cat=${cat.key}`}>{cat.label}</Link> / <span>{place.name}</span>
        </nav>

        <header className="place-head">
          <div className="place-photo">
            <VenuePhoto place={place} width={640} variant="hero" />
            <span className="place-photo-tag"><Emblem category={cat.key} size={14} /> {cat.singular}</span>
          </div>
          <div className="place-title">
            <p className="kicker">{cat.singular}{place.speciality ? ` · ${place.speciality.replace(/[_;]/g, ' ')}` : ''}{place.operator ? ` · ${place.operator}` : ''}</p>
            <h1 className="h1">{place.name}</h1>
            {place.localName && <p className="place-local">{place.localName}</p>}
            <p className="place-addr">
              {place.address || 'Street address not mapped yet'}{dist != null && <span className="muted"> · {fmtKm(dist)} from {location.name}</span>}
            </p>
            <PlaceActions place={place} />
          </div>
        </header>

        <div className="place-grid">
          <div className="place-main">
            <NowPanel est={est} now={now} />
            <ReportLine place={place} reports={placeReports} est={est} />
            <Forecast place={place} now={now} />
            <WeekStrip place={place} now={now} />
            <Details place={place} />
          </div>
          <aside className="place-side">
            <Booking place={place} est={est} now={now} />
          </aside>
        </div>
      </div>
    </main>
  );
}

const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ''));

function NowPanel({ est, now }) {
  const closed = est.status.open === false;
  return (
    <section className="nowpanel">
      <div className="np-cell np-big">
        <span className="kicker">Waiting now · est.</span>
        <span className="np-n display">{closed ? '—' : est.people}</span>
        <span className="np-l">{closed ? 'Closed right now' : est.people === 1 ? 'person in line' : 'people in line'}
          {est.adjusted && <> <span className="np-was">model {est.model.people}</span></>}</span>
        {est.adjusted && <span className="np-adj"><i />Adjusted by {est.reportCount} passenger report{est.reportCount === 1 ? '' : 's'}</span>}
      </div>
      <div className="np-cell">
        <span className="kicker">Your wait if you join</span>
        <span className="np-m">{closed ? '—' : fmtWait(est.wait)}</span>
      </div>
      <div className="np-cell">
        <span className="kicker">Counters assumed</span>
        <span className="np-m">{est.counters}</span>
      </div>
      <div className="np-cell">
        <span className="kicker">Status</span>
        <span className="np-m np-status"><span className={`dot ${closed ? 'dot-stop' : 'dot-go pulse'}`} />{est.status.label || 'Hours unknown'}</span>
      </div>
      <p className="np-note mono">{est.adjusted ? 'SKIPLY ESTIMATE + REPORTS FILED ON THIS DEVICE' : 'SKIPLY ESTIMATE'} · {new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · THIS VENUE HASN’T CONNECTED A LIVE COUNTER YET · <Link to="/about#estimates">HOW WE ESTIMATE</Link></p>
    </section>
  );
}

function Forecast({ place, now }) {
  const date = new Date(now);
  const data = useMemo(() => dayForecast(place, date), [place, date.getDate()]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(10, ...data.map((d) => d.wait));
  const hour = date.getHours();
  const best = data.filter((d) => d.hour > hour && d.status.open !== false).sort((a, b) => a.wait - b.wait)[0];
  const openHours = data.filter((d) => d.status.open !== false);
  const from = openHours.length ? openHours[0].hour : 0, to = openHours.length ? openHours[openHours.length - 1].hour : 23;
  const shown = data.filter((d) => d.hour >= Math.min(from, hour) && d.hour <= Math.max(to, hour));
  return (
    <section className="forecast">
      <div className="sec-mini-head">
        <div>
          <p className="kicker">Today’s forecast · {DAY_NAMES[(date.getDay() + 6) % 7]}</p>
          <h2 className="h3">{best ? <>Quietest later today: <em>{fmtMin(best.hour * 60)}</em> ({fmtWait(best.wait)})</> : 'Expected waits through the day'}</h2>
        </div>
      </div>
      <div className="fc-chart" role="img" aria-label="Estimated wait by hour">
        {shown.map((d) => {
          const closed = d.status.open === false;
          return (
            <div key={d.hour} className={`fc-bar ${d.hour === hour ? 'is-now' : ''} ${closed ? 'is-closed' : ''} ${best && best.hour === d.hour ? 'is-best' : ''}`}>
              <span className="fc-tip mono">{closed ? 'closed' : `${d.wait}m · ${d.people}`}</span>
              <span className="fc-fill" style={{ height: closed ? '3px' : `${Math.max(4, (d.wait / max) * 100)}%` }} />
              <span className="fc-h mono">{d.hour % 3 === 0 || d.hour === hour ? (d.hour === hour ? 'NOW' : fmtMin(d.hour * 60).replace(':00', '')) : ''}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Details({ place }) {
  const { parsed, source } = hoursFor(place);
  const today = (new Date().getDay() + 6) % 7;
  const osm = `https://www.openstreetmap.org/${place.osmType}/${place.osmId}`;
  const center = useMemo(() => ({ lat: place.lat, lng: place.lng }), [place.lat, place.lng]);
  const pins = useMemo(() => [place], [place]);
  return (
    <section className="details">
      <div className="details-cols">
        <div>
          <p className="kicker">Timetable {source === 'typical' && <span className="tag">typical hours</span>}</p>
          <table className="hours">
            <tbody>
              {DAY_NAMES.map((d, i) => {
                const r = parsed?.week[i] || [];
                return (
                  <tr key={d} className={i === today ? 'is-today' : ''}>
                    <th>{d}</th>
                    <td>{parsed?.always ? 'Open 24 hours' : r.length ? r.map((x) => `${fmtMin(x[0])} – ${fmtMin(x[1] % 1440)}`).join(', ') : 'Closed'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {source === 'typical' && <p className="muted small">This venue’s hours aren’t on OpenStreetMap. We’re showing typical hours for a {CATEGORIES[place.category].singular.toLowerCase()} in India. Call ahead to check.</p>}
          {place.hours && source === 'osm' && <p className="muted small mono">OSM: {place.hours}</p>}
        </div>
        <div>
          <p className="kicker">Contact</p>
          <dl className="facts">
            <dt>Address</dt><dd>{place.address || <span className="muted">Not mapped</span>}</dd>
            <dt>Phone</dt><dd>{place.phone ? place.phone.split(/[;,]/).map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className="link-u">{p.trim()}</a>) : <span className="muted">Not mapped</span>}</dd>
            <dt>Website</dt><dd>{place.website ? <a href={place.website.startsWith('http') ? place.website : `https://${place.website}`} target="_blank" rel="noreferrer" className="link-u">{place.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a> : <span className="muted">Not mapped</span>}</dd>
            {place.wheelchair && <><dt>Wheelchair</dt><dd>{{ yes: 'Accessible', limited: 'Limited access', no: 'Not accessible' }[place.wheelchair] || place.wheelchair}</dd></>}
            {place.emergency === 'yes' && <><dt>Emergency</dt><dd>Emergency department</dd></>}
          </dl>
          <div className="details-links">
            <a className="btn btn-ink btn-sm" href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noreferrer">Directions ↗</a>
            <a className="btn btn-line btn-sm" href={osm} target="_blank" rel="noreferrer">View on OSM ↗</a>
            <a className="btn btn-ghost btn-sm" href={`https://www.openstreetmap.org/edit?${place.osmType}=${place.osmId}`} target="_blank" rel="noreferrer">Fix details</a>
          </div>
        </div>
      </div>
      <PlaceMap center={center} places={pins} zoom={16} className="details-map" />
    </section>
  );
}

function slotsFor(place, day, now) {
  const { parsed } = hoursFor(place);
  const ranges = parsed?.always ? [[8 * 60, 22 * 60]] : rangesForDate(parsed, day);
  const out = [];
  ranges.forEach(([a, b]) => {
    for (let m = Math.ceil(a / 30) * 30; m + 30 <= b; m += 30) {
      const d = new Date(day); d.setHours(0, m, 0, 0);
      if (d.getTime() > now + 30 * 60000) out.push(d);
    }
  });
  return out;
}

function Booking({ place, est, now }) {
  const cat = CATEGORIES[place.category];
  const { addTicket, passenger, setPassenger } = useApp();
  const navigate = useNavigate();
  const closed = est.status.open === false;
  const [dept, setDept] = useState(cat.departments[0]);
  const [mode, setMode] = useState(closed ? 'advance' : 'live');
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState(passenger.name || '');
  const [phone, setPhone] = useState(passenger.phone || '');
  const [printed, setPrinted] = useState(null);

  useEffect(() => { setDept(cat.departments[0]); setMode(closed ? 'advance' : 'live'); setSlot(null); setPrinted(null); }, [place.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d; }), [Math.floor(now / 3600000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const slots = useMemo(() => slotsFor(place, days[dayIdx], now), [place, days, dayIdx, Math.floor(now / 600000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const phoneOk = !phone || /^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(phone.trim());
  const canBook = name.trim() && phoneOk && (mode === 'live' ? !closed : !!slot);

  const book = () => {
    if (!canBook) return;
    const p = { name: name.trim(), phone: phone.trim() };
    setPassenger(p);
    const t = createTicket({ place, department: dept, mode, slot: slot?.getTime(), estimate: est, passenger: p });
    addTicket(t);
    setPrinted(t);
    chime('ping');
    const r = document.querySelector('.booking-go')?.getBoundingClientRect();
    burst(r ? r.left + r.width / 2 : window.innerWidth / 2, r ? r.top : window.innerHeight / 2);
    toast({ tone: 'go', title: `Token ${t.token} issued`, body: `${place.name} · ${dept}`, action: { label: 'My tickets', to: '/tickets' }, ttl: 5000 });
  };

  if (printed) {
    return (
      <div className="booking booked">
        <p className="kicker">Ticket issued</p>
        <h2 className="h3">You’re in the queue.</h2>
        <div className="printer"><div className="printer-slot" /><Ticket ticket={printed} now={now} printing /></div>
        <p className="muted small">Your ticket is saved on this device. Keep this tab or come back to <b>My tickets</b> any time.</p>
        <div className="booking-row">
          <button className="btn btn-ink" onClick={() => navigate('/tickets')}>My tickets →</button>
          <button className="btn btn-line" onClick={() => setPrinted(null)}>Book another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking">
      <div className="booking-head">
        <p className="kicker">Booking office</p>
        <h2 className="h3">Take a token</h2>
      </div>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={mode === 'live'} disabled={closed} onClick={() => setMode('live')}>
          <b>Join now</b><span>{closed ? 'Closed' : `≈ ${fmtWait(est.wait)}`}</span>
        </button>
        <button role="tab" aria-selected={mode === 'advance'} onClick={() => setMode('advance')}>
          <b>Book a slot</b><span>Up to 7 days</span>
        </button>
      </div>

      <div className="field">
        <label>Counter</label>
        <div className="chips-wrap">
          {cat.departments.map((d) => <button key={d} className="chip" aria-pressed={dept === d} onClick={() => setDept(d)}>{d}</button>)}
        </div>
      </div>

      {mode === 'advance' && (
        <>
          <div className="field">
            <label>Day</label>
            <div className="days">
              {days.map((d, i) => (
                <button key={i} className={`day ${dayIdx === i ? 'is-on' : ''}`} onClick={() => { setDayIdx(i); setSlot(null); }}>
                  <span className="mono">{i === 0 ? 'TODAY' : d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</span>
                  <b>{d.getDate()}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Time <span className="slot-key"><i className="lv lv-low" />quiet <i className="lv lv-mid" />steady <i className="lv lv-high" />busy</span></label>
            {slots.length ? (
              <div className="slots">
                {slots.map((s) => {
                  const lvl = crowdLevel(estimateAt(place, s));
                  return (
                    <button key={s.getTime()} className={`slot ${slot?.getTime() === s.getTime() ? 'is-on' : ''}`} onClick={() => setSlot(s)}>
                      <i className={`lv lv-${lvl}`} />{s.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>
            ) : <p className="muted small">No slots left on this day. Try another day.</p>}
          </div>
        </>
      )}

      <div className="field-row">
        <div className="field"><label htmlFor="bk-name">Name</label><input id="bk-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="As you’d like to be called" /></div>
        <div className="field"><label htmlFor="bk-phone">Mobile (optional)</label><input id="bk-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="98765 43210" aria-invalid={!phoneOk} /></div>
      </div>
      {!phoneOk && <p className="cp-err">Enter a 10-digit Indian mobile number.</p>}

      <div className="booking-sum mono">
        {mode === 'live'
          ? <span>{closed ? 'Venue is closed, so book a slot instead.' : `≈ ${est.people} AHEAD · TURN AT ~${new Date(now + est.wait * 60000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}</span>
          : <span>{slot ? `${slot.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()} · ${slot.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'PICK A TIME'}</span>}
      </div>
      <button className="btn btn-ink booking-go" disabled={!canBook} onClick={book}>
        {mode === 'live' ? 'Print my token' : 'Reserve this slot'} →
      </button>
      <p className="muted small booking-fine">Free. Tokens are saved on this device. Until {place.name} connects to Skiply, your token tracks our estimate of the queue, so please arrive a few minutes early.</p>
    </div>
  );
}

function PlaceActions({ place }) {
  const { fav, cmp, onFav, onCmp } = usePlaceActions(place);
  const share = async () => {
    const url = window.location.href.split('#')[0];
    const text = `${place.name} on Skiply: live queue estimate and tokens`;
    try {
      if (navigator.share) { await navigator.share({ title: place.name, text, url }); return; }
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', body: place.name, tone: 'go', ttl: 2500 });
    } catch (e) { /* share sheet dismissed */ }
  };
  return (
    <div className="place-acts">
      <button className="place-act is-fav" aria-pressed={fav} onClick={onFav}><HeartIcon /> {fav ? 'Saved' : 'Save'}</button>
      <button className="place-act" aria-pressed={cmp} onClick={onCmp}><CompareIcon /> {cmp ? 'In compare' : 'Compare'}</button>
      <button className="place-act" onClick={share}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
        Share
      </button>
      <WatchButton place={place} />
    </div>
  );
}

const UNDER = [5, 10, 15, 20, 30];

/** "Tell me when the line is short": one alert (chime + voice + notification) when the wait drops. */
function WatchButton({ place }) {
  const { watchFor, setWatch, clearWatch } = useApp();
  const [open, setOpen] = useState(false);
  const w = watchFor(place.id);
  const choose = (m) => {
    setWatch(place, m); setOpen(false);
    toast({ tone: 'go', title: 'We’ll tell you', body: `When the wait at ${place.name} drops to ${m} min or less, you’ll hear a chime and an announcement.`, ttl: 5000 });
  };
  if (w) {
    return (
      <button className="place-act is-watch" aria-pressed="true" onClick={() => { clearWatch(place.id); toast({ title: 'Alert removed', body: place.name, ttl: 2500 }); }}>
        <span className="watch-bell"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" /></svg></span> Alert at ≤ {w.under} min ✕
      </button>
    );
  }
  return (
    <span className="watch-wrap">
      <button className="place-act" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" /></svg> Alert me when it’s short
      </button>
      {open && (
        <span className="watch-pop" role="menu">
          <span className="kicker">Tell me when the wait is</span>
          <span className="watch-opts">
            {UNDER.map((m) => <button key={m} role="menuitem" className="chip" onClick={() => choose(m)}>≤ {m} min</button>)}
          </span>
        </span>
      )}
    </span>
  );
}

const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`; };

function ReportLine({ place, reports, est }) {
  const { addReport } = useApp();
  const [picked, setPicked] = useState(null);
  const closed = est.status.open === false;
  const fresh = freshReports(reports, Date.now());
  const report = (b, e) => {
    addReport(place.id, { people: b.people });
    setPicked(b.key);
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 18);
    chime('ping');
    toast({ tone: 'go', title: 'Thanks for reporting', body: `${b.label === 'No line' ? 'No line' : `${b.label} people`} at ${place.name}. The estimate on this device now includes it.`, ttl: 4000 });
  };
  return (
    <section className="report" aria-label="Report the line">
      <div className="report-head">
        <div>
          <p className="kicker">You’re here? Help the next person</p>
          <h2 className="h3">Report the <em>line</em></h2>
        </div>
        <p className="muted small" style={{ maxWidth: '36ch' }}>{closed ? 'The venue looks closed. If it’s open, a report still helps.' : 'Roughly how many people are waiting right now?'}</p>
      </div>
      <div className="report-opts">
        {REPORT_BUCKETS.map((b, i) => (
          <button key={b.key} className={`report-opt ${picked === b.key ? 'is-picked' : ''}`} onClick={(e) => report(b, e)}>
            <span className="figs" aria-hidden="true">{Array.from({ length: i + 1 }, (_, k) => <i key={k} style={{ height: `${40 + k * 15}%` }} />)}</span>
            <b>{b.label}</b>
            <span className="mono small muted">{b.key === 'none' ? 'walk in' : 'people'}</span>
          </button>
        ))}
      </div>
      {reports.length > 0 && (
        <div className="report-log">
          <span style={{ border: 0, background: 'none', padding: 0 }}>{fresh.length ? `${fresh.length} FRESH` : 'NONE FRESH'} · LAST 45 MIN COUNT</span>
          {reports.slice(0, 5).map((r) => <span key={r.t}>{bucketLabel(r.people)} · {ago(r.t)}</span>)}
        </div>
      )}
    </section>
  );
}

function WeekStrip({ place, now }) {
  const days = useMemo(() => {
    const today = new Date(now);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const all = dayForecast(place, d).filter((h) => h.status.open !== false && (i > 0 || h.hour > today.getHours()));
      // Prefer waking hours (7 AM–9 PM); 24-hour venues are always "calmest" at 3 AM, which helps nobody.
      const awake = all.filter((h) => h.hour >= 7 && h.hour <= 21);
      const hours = awake.length ? awake : all;
      const best = hours.sort((a, b) => a.wait - b.wait)[0];
      return { d, i, best };
    });
  }, [place, Math.floor(now / 3600000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = days.filter((x) => x.best);
  const max = Math.max(10, ...open.map((x) => x.best.wait));
  const overall = open.slice().sort((a, b) => a.best.wait - b.best.wait)[0];
  return (
    <section className="week">
      <p className="kicker">Best time this week</p>
      <h2 className="h3">{overall ? <>Calmest: <em>{overall.i === 0 ? 'today' : overall.d.toLocaleDateString('en-IN', { weekday: 'long' })}</em> at {fmtMin(overall.best.hour * 60)}</> : 'No open hours this week'}</h2>
      <div className="week-strip">
        {days.map(({ d, i, best }) => {
          const lvl = best ? crowdLevel(best) : 'closed';
          return (
            <div key={i} className={`week-day lvl-${lvl} ${!best ? 'is-closed' : ''} ${overall && overall.i === i ? 'is-best' : ''}`}>
              <span className="wk-bar" style={{ height: best ? `${Math.max(8, (best.wait / max) * 100)}%` : '0%' }} />
              <span className="mono">{i === 0 ? 'TODAY' : d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</span>
              <b>{best ? fmtMin(best.hour * 60).replace(':00', '') : i === 0 ? 'Day’s done' : 'Closed'}</b>
              <span className="wk-w">{best ? fmtWait(best.wait) : '—'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
