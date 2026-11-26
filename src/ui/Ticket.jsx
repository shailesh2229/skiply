import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { CATEGORIES } from '../data/categories';
import { ticketState } from '../lib/tickets';
import { hash01 } from '../lib/geo';
import { downloadICS } from '../lib/ics';
import { toast, chime } from '../lib/fx';
import Emblem from './Emblem';
import '../styles/tickets2.css';

function Barcode({ seed }) {
  const bars = Array.from({ length: 34 }, (_, i) => 1 + Math.floor(hash01(seed + i) * 3.2));
  let x = 0;
  return (
    <svg className="barcode" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((w, i) => { const r = <rect key={i} x={x} y="0" width={i % 2 ? w * 0.9 : w} height="34" opacity={i % 2 ? 0 : 1} />; x += w * 1.15; return r; })}
    </svg>
  );
}

/** Real, scannable QR for the ticket. Colours are themed in CSS. */
export function QR({ value, className = '', label }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#0000' } })
      .then((s) => live && setSvg(s)).catch(() => {});
    return () => { live = false; };
  }, [value]);
  return <span className={`qr ${className}`} role="img" aria-label={label || 'Ticket QR code'} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Circular progress ring with a number in the middle. */
export function Ring({ value, unit, progress = 0, size = 64, label }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <span className="tk-ring" style={{ width: size, height: size }} aria-label={label}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="tk-ring-bg" />
        <circle cx="32" cy="32" r={r} className="tk-ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))} />
      </svg>
      <b>{value}{unit && <small>{unit}</small>}</b>
    </span>
  );
}

export const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export function countdown(ms) {
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} days`;
}

export async function shareTicket(ticket, st) {
  const url = `${window.location.origin}/place/${ticket.placeId}`;
  const when = st?.eta ? ` · ${ticket.mode === 'advance' ? fmtDate(st.eta) + ', ' : 'turn ≈ '}${fmtTime(st.eta)}` : '';
  const text = `My Skiply token ${ticket.token} at ${ticket.placeName}${when}`;
  try {
    if (navigator.share) { await navigator.share({ title: `Skiply ${ticket.token}`, text, url }); return; }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast({ title: 'Copied to clipboard', body: 'Paste it anywhere to share your token.', tone: 'go' });
  } catch (e) {
    if (e?.name !== 'AbortError') toast({ title: 'Couldn’t share', body: 'Your browser blocked sharing. Try copying the page link.', tone: 'warn' });
  }
}

export default function Ticket({ ticket, now, onCancel, onRemove, printing }) {
  const cat = CATEGORIES[ticket.category];
  const st = ticketState(ticket, now);
  const [flipped, setFlipped] = useState(false);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${ticket.lat},${ticket.lng}`;
  const over = ['done', 'cancelled'].includes(st.phase);
  const payload = `SKIPLY|${ticket.id}|${ticket.token}|${ticket.placeId}`;
  const start = st.eta || ticket.slot || ticket.createdAt;

  const flip = () => { setFlipped((f) => !f); chime('ping'); };
  // Click on empty ticket paper flips it; buttons and links keep their own behaviour.
  const onPaper = (e) => { if (!printing && !e.target.closest('a,button')) flip(); };

  return (
    <div className={`tkx ph-${st.phase} ${flipped ? 'is-flipped' : ''} ${printing ? 'is-printing-wrap' : ''}`} style={{ '--cat': cat.neon }}>
      <div className="tkx-inner">
        {/* ── front ── */}
        <article className={`ticket tkx-front ph-${st.phase} ${printing ? 'is-printing' : ''}`} onClick={onPaper} aria-hidden={flipped}>
          <span className="tkx-shine" aria-hidden="true" />
          <div className="ticket-main">
            <div className="ticket-top mono">
              <span>SKIPLY · ADMIT ONE</span>
              <span>{ticket.mode === 'live' ? 'LIVE QUEUE' : 'BOOKED SLOT'} · PLAT {cat.platform}</span>
            </div>
            <Link to={`/place/${ticket.placeId}`} className="ticket-venue" tabIndex={flipped ? -1 : 0}>{ticket.placeName}</Link>
            <p className="ticket-sub">{ticket.department}{ticket.passenger?.name ? ` · ${ticket.passenger.name}` : ''}</p>

            <div className="ticket-stats tkx-stats">
              {ticket.mode === 'live' && st.ahead != null && !over && (
                <Ring value={st.ahead} unit="ahead" progress={st.progress} label={`${st.ahead} ahead of you`} />
              )}
              {ticket.mode === 'advance' && st.phase === 'scheduled' && (
                <Ring value={countdown(st.until).split(' ')[0]} unit={countdown(st.until).split(' ')[1] || ''} progress={1 - Math.min(1, st.until / (24 * 3600000))} label={`Starts in ${countdown(st.until)}`} />
              )}
              <div><span className="kicker">Status</span><b className={`ticket-status st-${st.phase}`}>{st.label}</b></div>
              {st.eta && st.phase !== 'cancelled' && (
                <div><span className="kicker">{ticket.mode === 'live' ? 'Est. turn' : 'Slot'}</span><b>{ticket.mode === 'advance' ? `${fmtDate(st.eta)}, ` : ''}{fmtTime(st.eta)}</b></div>
              )}
            </div>
            {ticket.mode === 'live' && st.progress != null && st.phase !== 'cancelled' && (
              <div className="ticket-progress" aria-label="Queue progress"><span style={{ width: `${Math.round(st.progress * 100)}%` }} /></div>
            )}
            {!printing && (
              <div className="ticket-actions">
                {!over && <a className="btn btn-ink btn-sm" href={directions} target="_blank" rel="noreferrer" tabIndex={flipped ? -1 : 0}>Directions ↗</a>}
                {!over && <button className="btn btn-line btn-sm" onClick={() => downloadICS(ticket, start)} tabIndex={flipped ? -1 : 0} title="Download a calendar event (.ics)">＋ Calendar</button>}
                <button className="btn btn-line btn-sm" onClick={() => shareTicket(ticket, st)} tabIndex={flipped ? -1 : 0}>Share</button>
                <button className="btn btn-ghost btn-sm" onClick={flip} aria-pressed={flipped} tabIndex={flipped ? -1 : 0}>⟲ Boarding pass</button>
                {!over && onCancel && <button className="btn btn-ghost btn-sm tkx-danger" onClick={() => onCancel(ticket.id)} tabIndex={flipped ? -1 : 0}>Cancel</button>}
                {over && onRemove && <button className="btn btn-ghost btn-sm" onClick={() => onRemove(ticket.id)} tabIndex={flipped ? -1 : 0}>Remove</button>}
              </div>
            )}
          </div>
          <div className="ticket-stub">
            <span className="kicker">Token</span>
            <span className="ticket-token">{ticket.token}</span>
            <QR value={payload} className="tkx-qr-sm" label={`QR code for token ${ticket.token}`} />
            <Barcode seed={ticket.id} />
            <span className="mono ticket-id">{ticket.id} · {fmtDate(ticket.createdAt)}</span>
          </div>
        </article>

        {/* ── back: boarding pass ── */}
        {!printing && (
          <article className="tkx-back" onClick={onPaper} aria-hidden={!flipped}>
            <div className="tkx-back-main">
              <div className="tkx-back-top mono">
                <span><Emblem category={ticket.category} size={14} /> PLATFORM {cat.platform} · {cat.singular.toUpperCase()}</span>
                <span>BOARDING PASS</span>
              </div>
              <p className="tkx-back-token">{ticket.token}</p>
              <p className="tkx-back-venue">{ticket.placeName}</p>
              <dl className="tkx-back-facts mono">
                <div><dt>Counter</dt><dd>{ticket.department}</dd></div>
                <div><dt>Passenger</dt><dd>{ticket.passenger?.name || '—'}</dd></div>
                <div><dt>{ticket.mode === 'live' ? 'Est. turn' : 'Slot'}</dt><dd>{st.eta ? `${fmtDate(st.eta)} · ${fmtTime(st.eta)}` : '—'}</dd></div>
                <div><dt>Issued</dt><dd>{fmtDate(ticket.createdAt)} · {fmtTime(ticket.createdAt)}</dd></div>
                <div className="wide"><dt>Address</dt><dd>{ticket.address || 'Not mapped'}</dd></div>
              </dl>
              <button className="btn btn-sm tkx-back-btn" onClick={flip} tabIndex={flipped ? 0 : -1}>⟲ Flip back</button>
            </div>
            <div className="tkx-back-qr">
              <QR value={payload} label={`Large QR code for token ${ticket.token}`} />
              <span className="mono">SHOW AT THE COUNTER</span>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
