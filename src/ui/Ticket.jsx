import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { ticketState } from '../lib/tickets';
import { hash01 } from '../lib/geo';

function Barcode({ seed }) {
  const bars = Array.from({ length: 34 }, (_, i) => 1 + Math.floor(hash01(seed + i) * 3.2));
  let x = 0;
  return (
    <svg className="barcode" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((w, i) => { const r = <rect key={i} x={x} y="0" width={i % 2 ? w * 0.9 : w} height="34" opacity={i % 2 ? 0 : 1} />; x += w * 1.15; return r; })}
    </svg>
  );
}

const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

function countdown(ms) {
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} days`;
}

export default function Ticket({ ticket, now, onCancel, onRemove, printing }) {
  const cat = CATEGORIES[ticket.category];
  const st = ticketState(ticket, now);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${ticket.lat},${ticket.lng}`;
  return (
    <article className={`ticket ph-${st.phase} ${printing ? 'is-printing' : ''}`}>
      <div className="ticket-main">
        <div className="ticket-top mono">
          <span>SKIPLY · ADMIT ONE</span>
          <span>{ticket.mode === 'live' ? 'LIVE QUEUE' : 'BOOKED SLOT'} · PLAT {cat.platform}</span>
        </div>
        <Link to={`/place/${ticket.placeId}`} className="ticket-venue">{ticket.placeName}</Link>
        <p className="ticket-sub">{ticket.department}{ticket.passenger?.name ? ` · ${ticket.passenger.name}` : ''}</p>

        <div className="ticket-stats">
          <div><span className="kicker">Status</span><b className={`ticket-status st-${st.phase}`}>{st.label}</b></div>
          {ticket.mode === 'live' && st.ahead != null && st.phase !== 'cancelled' && (
            <div><span className="kicker">Ahead of you</span><b>{st.ahead}</b></div>
          )}
          {st.phase === 'scheduled' && <div><span className="kicker">Starts in</span><b>{countdown(st.until)}</b></div>}
          {st.eta && st.phase !== 'cancelled' && (
            <div><span className="kicker">{ticket.mode === 'live' ? 'Est. turn' : 'Slot'}</span><b>{ticket.mode === 'advance' ? `${fmtDate(st.eta)}, ` : ''}{fmtTime(st.eta)}</b></div>
          )}
        </div>
        {ticket.mode === 'live' && st.progress != null && st.phase !== 'cancelled' && (
          <div className="ticket-progress" aria-label="Queue progress"><span style={{ width: `${Math.round(st.progress * 100)}%` }} /></div>
        )}
        <div className="ticket-actions">
          {!['done', 'cancelled'].includes(st.phase) && <a className="btn btn-ink btn-sm" href={directions} target="_blank" rel="noreferrer">Directions ↗</a>}
          {!['done', 'cancelled'].includes(st.phase) && onCancel && <button className="btn btn-line btn-sm" onClick={() => onCancel(ticket.id)}>Cancel</button>}
          {['done', 'cancelled'].includes(st.phase) && onRemove && <button className="btn btn-ghost btn-sm" onClick={() => onRemove(ticket.id)}>Remove</button>}
        </div>
      </div>
      <div className="ticket-stub">
        <span className="kicker">Token</span>
        <span className="ticket-token">{ticket.token}</span>
        <Barcode seed={ticket.id} />
        <span className="mono ticket-id">{ticket.id} · {fmtDate(ticket.createdAt)}</span>
      </div>
    </article>
  );
}
