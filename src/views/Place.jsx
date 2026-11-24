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
import PlaceMap from '../ui/PlaceMap';
import Ticket from '../ui/Ticket';
import { crowdLevel } from '../ui/PlaceCard';

export default function Place() {
  const { pid } = useParams();
  const routeState = useLocation().state;
  const [place, setPlace] = useState(() => routeState?.place || cachedPlace(pid));
  const [status, setStatus] = useState(place ? 'ok' : 'loading');
  const { location } = useApp();
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
  const est = estimateAt(place, new Date(now));
  const dist = location ? distanceKm(location, place) : null;
  return (
    <main className="place">
      <div className="wrap">
        <nav className="crumbs mono" aria-label="Breadcrumb">
          <Link to="/">Skiply</Link> / <Link to={`/explore?cat=${cat.key}`}>{cat.label}</Link> / <span>{place.name}</span>
        </nav>

        <header className="place-head">
          <div className="place-sign">
            <span className="place-plat"><span className="mono">PLATFORM</span><b>{cat.platform}</b></span>
            <Emblem category={cat.key} size={40} />
          </div>
          <div className="place-title">
            <p className="kicker">{cat.singular}{place.speciality ? ` · ${place.speciality.replace(/[_;]/g, ' ')}` : ''}{place.operator ? ` · ${place.operator}` : ''}</p>
            <h1 className="h1">{place.name}</h1>
            {place.localName && <p className="place-local">{place.localName}</p>}
            <p className="place-addr">
              {place.address || 'Street address not mapped yet'}{dist != null && <span className="muted"> · {fmtKm(dist)} from {location.name}</span>}
            </p>
          </div>
        </header>

        <div className="place-grid">
          <div className="place-main">
            <NowPanel est={est} now={now} />
            <Forecast place={place} now={now} />
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
        <span className="np-l">{closed ? 'Closed right now' : est.people === 1 ? 'person in line' : 'people in line'}</span>
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
      <p className="np-note mono">SKIPLY ESTIMATE · {new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · THIS VENUE HASN’T CONNECTED A LIVE COUNTER YET · <Link to="/about#estimates">HOW WE ESTIMATE</Link></p>
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
