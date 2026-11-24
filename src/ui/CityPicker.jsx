import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CITIES, POPULAR_CITIES } from '../data/cities';
import { useApp } from '../context/AppContext';
import { searchLocalities } from '../services/places';

export default function CityPicker({ open, onClose }) {
  const { setLocation, locate, locating, location } = useApp();
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState([]);
  const [err, setErr] = useState('');
  const input = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ(''); setRemote([]); setErr('');
    setTimeout(() => input.current?.focus(), 50);
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? CITIES.filter((c) => c.name.toLowerCase().includes(s) || c.state.toLowerCase().includes(s)) : [];
  }, [q]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 3) { setRemote([]); return undefined; }
    const id = setTimeout(() => searchLocalities(s).then(setRemote).catch(() => setRemote([])), 450);
    return () => clearTimeout(id);
  }, [q]);

  if (!open) return null;
  const pick = (c, source = 'city') => { setLocation({ ...c, source }); onClose(); };
  const useGps = async () => {
    setErr('');
    try { await locate(); onClose(); } catch (e) {
      setErr(e.code === 1 ? 'Location permission was denied. Pick a city instead.' : 'Could not get your location. Pick a city instead.');
    }
  };

  const grouped = CITIES.reduce((acc, c) => { (acc[c.name[0]] ||= []).push(c); return acc; }, {});

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal citypicker" role="dialog" aria-modal="true" aria-label="Choose your station">
        <div className="modal-head">
          <div>
            <p className="kicker">Change station</p>
            <h2 className="h3">Where are you waiting today?</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="cp-search">
          <input ref={input} className="input" placeholder="City, locality or pincode, e.g. Koramangala" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-ink" onClick={useGps} disabled={locating}>
            {locating ? 'Locating…' : '◎ Use my location'}
          </button>
        </div>
        {err && <p className="cp-err">{err}</p>}
        <div className="cp-body">
          {q.trim() ? (
            <>
              {local.length > 0 && <p className="kicker cp-label">Cities</p>}
              <div className="cp-list">
                {local.map((c) => (
                  <button key={c.name} className="cp-row" onClick={() => pick(c)}><b>{c.name}</b><span className="muted">{c.state}</span></button>
                ))}
              </div>
              {remote.length > 0 && <p className="kicker cp-label">Localities · OpenStreetMap</p>}
              <div className="cp-list">
                {remote.map((c, i) => (
                  <button key={i} className="cp-row" onClick={() => pick({ name: c.name, state: c.detail, lat: c.lat, lng: c.lng }, 'search')}>
                    <b>{c.name}</b><span className="muted">{c.detail}</span>
                  </button>
                ))}
              </div>
              {!local.length && !remote.length && <p className="muted cp-empty">{q.trim().length < 3 ? 'Keep typing…' : 'Searching OpenStreetMap…'}</p>}
            </>
          ) : (
            <>
              <p className="kicker cp-label">Popular stations</p>
              <div className="cp-popular">
                {POPULAR_CITIES.map((c) => (
                  <button key={c.name} className={`cp-pop ${location?.name === c.name ? 'is-on' : ''}`} onClick={() => pick(c)}>
                    <span className="cp-pop-name">{c.name}</span>
                    <span className="mono cp-pop-coord">{c.lat.toFixed(2)}°N {c.lng.toFixed(2)}°E</span>
                  </button>
                ))}
              </div>
              <p className="kicker cp-label">All cities A–Z</p>
              <div className="cp-az">
                {Object.entries(grouped).map(([letter, list]) => (
                  <div key={letter} className="cp-az-group">
                    <span className="cp-az-letter">{letter}</span>
                    <div>{list.map((c) => <button key={c.name} className="cp-az-city" onClick={() => pick(c)}>{c.name}</button>)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
