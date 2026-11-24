import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';

export default function Profile() {
  const { passenger, setPassenger, tickets, location } = useApp();
  const [name, setName] = useState(passenger.name);
  const [phone, setPhone] = useState(passenger.phone);
  const [saved, setSaved] = useState(false);
  const live = tickets.filter((t) => !t.cancelled);
  const byCat = live.reduce((a, t) => ({ ...a, [t.category]: (a[t.category] || 0) + 1 }), {});
  const fav = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const save = (e) => { e.preventDefault(); setPassenger({ name: name.trim(), phone: phone.trim() }); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const wipe = () => {
    if (!window.confirm('Erase every Skiply ticket and detail stored in this browser?')) return;
    ['skiply.tickets', 'skiply.passenger', 'skiply.location', 'skiply.theme'].forEach((k) => localStorage.removeItem(k));
    window.location.href = '/';
  };

  return (
    <main className="profile">
      <div className="wrap profile-grid">
        <section className="pass">
          <div className="pass-top"><span className="brand-word">SKIPLY</span><span className="mono">PASSENGER CARD</span></div>
          <p className="pass-name display">{passenger.name || 'Unnamed traveller'}</p>
          <div className="pass-row mono">
            <span>HOME STATION<br /><b>{location.name}</b></span>
            <span>TOKENS<br /><b>{live.length}</b></span>
            <span>FAVOURITE<br /><b>{fav ? CATEGORIES[fav[0]].label : '—'}</b></span>
          </div>
        </section>
        <form className="booking" onSubmit={save}>
          <p className="kicker">Passenger details</p>
          <h1 className="h3">Used to fill in your tokens faster</h1>
          <div className="field"><label htmlFor="p-name">Name</label><input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="p-phone">Mobile</label><input id="p-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></div>
          <button className="btn btn-ink">{saved ? '✓ Saved' : 'Save details'}</button>
          <hr className="rule" />
          <p className="muted small">Everything lives in this browser's local storage. Nothing is uploaded.</p>
          <button type="button" className="btn btn-line btn-sm" onClick={wipe}>Erase my Skiply data</button>
        </form>
      </div>
    </main>
  );
}
