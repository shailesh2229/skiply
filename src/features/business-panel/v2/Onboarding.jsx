import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useNearby } from '../../../lib/hooks';
import { searchVenues } from '../../../services/places';
import { CATEGORIES } from '../../../data/categories';
import { fmtKm } from '../../../lib/geo';
import Emblem from '../../../ui/Emblem';

const STEPS = ['Find your business', 'Your counters', 'You’re live'];

function Stepper({ value, set, min, max, unit, label, hint }) {
  return (
    <div className="ob-stepper">
      <div className="ob-stepper-t"><b>{label}</b><span>{hint}</span></div>
      <div className="ob-stepper-c">
        <button type="button" onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Less ${label}`}>−</button>
        <output aria-live="polite"><b>{value}</b><span>{unit}</span></output>
        <button type="button" onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label}`}>+</button>
      </div>
    </div>
  );
}

/** Three friendly steps for a first-time owner. */
export default function Onboarding({ onFinish }) {
  const { location } = useApp();
  const { places, loading } = useNearby(location);
  const [step, setStep] = useState(0);
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [venue, setVenue] = useState(null);
  const [counters, setCounters] = useState(2);
  const [service, setService] = useState(10);
  const [announce, setAnnounce] = useState(true);

  const s = q.trim().toLowerCase();
  const list = found || places.filter((p) => !s || p.name.toLowerCase().includes(s)).slice(0, 12);

  const search = async (e) => {
    e.preventDefault();
    if (s.length < 3) return;
    setBusy(true);
    try { setFound(await searchVenues(q.trim(), location)); } catch (err) { setFound([]); } finally { setBusy(false); }
  };

  const pick = (p) => {
    const v = { ...p }; delete v.distance;
    const cat = CATEGORIES[p.category];
    setVenue(v);
    setCounters(Math.min(8, Math.max(1, cat.counters)));
    setService(cat.service);
    setStep(1);
  };

  const finish = (to) => onFinish(venue, { counters, service, announce }, to);

  return (
    <div className="ob">
      <ol className="ob-progress" aria-label="Setup steps">
        {STEPS.map((t, i) => (
          <li key={t} className={i === step ? 'is-now' : i < step ? 'is-done' : ''}>
            <span>{i < step ? '✓' : i + 1}</span>{t}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="ob-card">
          <p className="sp-k">Step 1 of 3</p>
          <h1 className="sp-title">Which business is <span>yours?</span></h1>
          <p className="sp-lead">Type your business name, or tap it below. These are real places near {location.name} from the public map.</p>
          <form className="ob-search" onSubmit={search}>
            <input value={q} onChange={(e) => { setQ(e.target.value); setFound(null); }} placeholder="e.g. Sunrise Dental Clinic" aria-label="Business name" autoFocus />
            <button className="sp-btn sp-btn-primary" disabled={busy || s.length < 3}>{busy ? 'Searching…' : 'Search'}</button>
          </form>
          <div className="ob-list">
            {loading && !places.length && Array.from({ length: 6 }, (_, i) => <div key={i} className="ob-pick skel" />)}
            {list.map((p) => (
              <button key={p.id} className="ob-pick" onClick={() => pick(p)}>
                <span className="ob-pick-i"><Emblem category={p.category} size={20} /></span>
                <span className="ob-pick-t"><b>{p.name}</b><span>{CATEGORIES[p.category].singular}{p.distance != null ? ` · ${fmtKm(p.distance)} away` : ''}</span></span>
                <em>This is mine →</em>
              </button>
            ))}
            {!loading && !list.length && <p className="sp-muted">Nothing matches yet. Press <b>Search</b> to look further.</p>}
          </div>
        </section>
      )}

      {step === 1 && venue && (
        <section className="ob-card">
          <p className="sp-k">Step 2 of 3 · {venue.name}</p>
          <h1 className="sp-title">How do you <span>serve people?</span></h1>
          <p className="sp-lead">Two quick numbers. Skiply uses them to tell customers how long they’ll wait. You can change them later in Settings.</p>
          <div className="ob-steppers">
            <Stepper label="Counters open" hint="Desks, doctors, chairs or tellers serving at the same time" value={counters} set={setCounters} min={1} max={8} unit={counters === 1 ? 'counter' : 'counters'} />
            <Stepper label="Time per customer" hint="Roughly how long one person takes, on average" value={service} set={setService} min={1} max={60} unit="minutes" />
          </div>
          <label className="ob-check">
            <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
            <span><b>Read token numbers aloud</b> when you call the next customer</span>
          </label>
          <p className="ob-preview">With these numbers, a customer with <b>5 people ahead</b> waits about <b>{Math.round((5 * service) / counters)} minutes</b>.</p>
          <div className="ob-actions">
            <button className="sp-btn" onClick={() => setStep(0)}>← Back</button>
            <button className="sp-btn sp-btn-primary" onClick={() => setStep(2)}>Continue →</button>
          </div>
        </section>
      )}

      {step === 2 && venue && (
        <section className="ob-card ob-live">
          <div className="ob-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
          <p className="sp-k">Step 3 of 3</p>
          <h1 className="sp-title">You’re <span>live!</span></h1>
          <p className="sp-lead"><b>{venue.name}</b> is now on Skiply with {counters} {counters === 1 ? 'counter' : 'counters'}. Customers who book on Skiply will appear in your line.</p>
          <div className="ob-next">
            <button className="ob-big" onClick={() => finish('/business-panel/queue')}>
              <b>Open the live queue</b><span>See who’s waiting and call the next customer</span>
            </button>
            <button className="ob-big ob-big-alt" onClick={() => finish('/business-panel/display')}>
              <b>Put up the TV screen</b><span>A big “Now serving” display for your waiting area</span>
            </button>
          </div>
          <button className="sp-link" onClick={() => finish('/business-panel')}>Go to Home instead</button>
        </section>
      )}
    </div>
  );
}
