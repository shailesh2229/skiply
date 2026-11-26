import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNow } from '../lib/hooks';
import { ticketState } from '../lib/tickets';
import { askNotify, chime, toast } from '../lib/fx';
import Ticket from '../ui/Ticket';
import CountUp from '../ui/CountUp';
import '../styles/tickets2.css';

const OVER = ['done', 'cancelled'];

function EmptyArt() {
  return (
    <svg className="tk-empty-art" viewBox="0 0 440 150" aria-hidden="true">
      {Array.from({ length: 23 }, (_, i) => <line key={i} className="sleeper" x1={10 + i * 19} y1="118" x2={10 + i * 19} y2="132" strokeWidth="3" />)}
      <line className="rail" x1="0" y1="121" x2="440" y2="121" strokeWidth="2" />
      <line className="rail" x1="0" y1="129" x2="440" y2="129" strokeWidth="2" />
      <rect className="ghost" x="150" y="18" width="140" height="62" rx="8" strokeWidth="2" />
      <text className="tk-q" x="220" y="57" textAnchor="middle">S-???</text>
      <g className="train">
        <rect x="0" y="86" width="96" height="30" rx="6" />
        <rect className="nose" x="90" y="86" width="22" height="30" rx="10" />
        {[10, 32, 54].map((x) => <rect key={x} className="win" x={x} y="93" width="14" height="9" rx="2" />)}
      </g>
    </svg>
  );
}

function Switch({ on, onChange, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)} />;
}

export default function Tickets() {
  const { tickets, cancelTicket, removeTicket, settings, setSettings } = useApp();
  const now = useNow(5000);
  const [tab, setTab] = useState('active');
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  const groups = useMemo(() => {
    const g = { active: [], scheduled: [], past: [] };
    tickets.forEach((t) => {
      const ph = ticketState(t, now).phase;
      if (OVER.includes(ph)) g.past.push(t);
      else if (ph === 'scheduled') g.scheduled.push(t);
      else g.active.push(t);
    });
    g.scheduled.sort((a, b) => a.slot - b.slot);
    return g;
  }, [tickets, now]);

  const kept = tickets.filter((t) => !t.cancelled);
  const saved = Math.round(kept.reduce((s, t) => s + (t.mode === 'live' ? t.ahead * t.perPerson : t.perPerson * 3), 0));
  const venues = new Set(kept.map((t) => t.placeId)).size;
  const cancel = (id) => { if (window.confirm('Cancel this token? Your place in line will be released.')) { cancelTicket(id); toast({ title: 'Token cancelled', body: 'Your place in line has been released.', tone: 'warn' }); } };

  const enableAlerts = async () => {
    const p = await askNotify();
    setPerm(p);
    if (p === 'granted') {
      setSettings({ notify: true });
      chime('dingdong', true);
      toast({ title: 'Alerts are on', body: 'We’ll ping you when your turn is close, even if this tab is in the background.', tone: 'go' });
    } else if (p === 'denied') {
      toast({ title: 'Notifications blocked', body: 'Allow notifications for this site in your browser settings to get alerts.', tone: 'warn' });
    }
  };

  const tabs = [['active', 'Active'], ['scheduled', 'Scheduled'], ['past', 'Past']];
  const list = groups[tab];
  const alertsOn = settings.notify && perm === 'granted';

  return (
    <main className="tickets-page">
      <div className="wrap">
        <header className="tk-hero">
          <div>
            <p className="kicker">Ticket wallet · stored on this device</p>
            <h1 className="h1">My <em>tickets</em></h1>
          </div>
          <div className="tk-stats">
            <div className="tk-stat"><span className="kicker">Active</span><b><CountUp value={groups.active.length + groups.scheduled.length} /></b></div>
            <div className="tk-stat"><span className="kicker">Not standing</span><b><CountUp value={saved} /><small>min</small></b></div>
            <div className="tk-stat"><span className="kicker">Venues</span><b><CountUp value={venues} /></b></div>
          </div>
        </header>

        {!tickets.length ? (
          <div className="tk-empty">
            <EmptyArt />
            <p className="display">The platform is <em>empty.</em></p>
            <p className="muted" style={{ maxWidth: '46ch' }}>Find a venue on the board and take a token. It lands here with a live countdown, a QR code for the counter and a calendar reminder.</p>
            <div className="booking-row" style={{ justifyContent: 'center' }}>
              <Link to="/explore" className="btn btn-ink">Browse departures →</Link>
              <Link to="/" className="btn btn-line">Back to the concourse</Link>
            </div>
          </div>
        ) : (
          <div className="tk-body">
            <section>
              <div className="tk-tabs" role="tablist" aria-label="Ticket groups">
                {tabs.map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}<span>{groups[k].length}</span></button>
                ))}
              </div>
              {list.length ? (
                <div className="tk-list" role="tabpanel">
                  {list.map((t, i) => (
                    <div key={t.id} style={{ '--i': i }} className="tk-item">
                      <Ticket ticket={t} now={now} onCancel={tab !== 'past' ? cancel : undefined} onRemove={tab === 'past' ? removeTicket : undefined} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tk-card" style={{ maxWidth: 520 }}>
                  <h3>{{ active: 'No one’s holding your place right now.', scheduled: 'Nothing booked ahead.', past: 'No past journeys yet.' }[tab]}</h3>
                  <p>{{ active: 'Join a live queue from any venue page and it appears here.', scheduled: 'Book a quiet slot up to a week ahead from any venue page.', past: 'Completed and cancelled tokens collect here.' }[tab]}</p>
                  <Link to="/explore" className="btn btn-ink btn-sm" style={{ justifySelf: 'start' }}>Find a queue →</Link>
                </div>
              )}
            </section>

            <aside className="tk-side">
              <div className="tk-card tk-alert">
                <span className={`tk-bell ${alertsOn ? 'is-ringing' : ''}`}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" /></svg>
                </span>
                <h3>{alertsOn ? 'Alerts are on.' : 'Get a tap on the shoulder.'}</h3>
                <p>{alertsOn ? 'You’ll get a notification when two people are left ahead of you, when it’s your turn, and when to leave for a booked slot.' : 'We’ll notify you when your turn is close, even with this tab in the background.'}</p>
                {perm === 'unsupported' ? <p className="muted small">This browser doesn’t support notifications. In-page alerts still work.</p>
                  : alertsOn ? <span className="tk-ok">✓ NOTIFICATIONS ALLOWED</span>
                    : <button className="btn btn-ink btn-sm" style={{ justifySelf: 'start' }} onClick={enableAlerts}>{perm === 'denied' ? 'Blocked in browser' : 'Enable alerts'}</button>}
                <div>
                  <div className="tk-toggle"><span>Station chime</span><Switch on={settings.sound} label="Station chime" onChange={(v) => { setSettings({ sound: v }); if (v) chime('ping', true); }} /></div>
                  <div className="tk-toggle"><span>Spoken announcements</span><Switch on={settings.voice} label="Spoken announcements" onChange={(v) => setSettings({ voice: v })} /></div>
                  {alertsOn && <div className="tk-toggle"><span>System notifications</span><Switch on={settings.notify} label="System notifications" onChange={(v) => setSettings({ notify: v })} /></div>}
                </div>
              </div>
              <div className="tk-card">
                <p className="kicker">Tip</p>
                <p>Tap any ticket to flip it into a boarding pass with a large QR code for the counter.</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
