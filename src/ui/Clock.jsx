import React from 'react';
import { useNow } from '../lib/hooks';

// A classic station clock showing the visitor's local time.
export function StationClock({ size = 120 }) {
  const now = new Date(useNow(1000));
  const s = now.getSeconds(), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="station-clock" role="img" aria-label={`Time ${now.toLocaleTimeString()}`}>
      <circle cx="50" cy="50" r="48" className="sc-rim" />
      <circle cx="50" cy="50" r="44" className="sc-face" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="50" y1={i % 5 ? 8.5 : 7.5} x2="50" y2={i % 5 ? 11 : 16} className={i % 5 ? 'sc-min' : 'sc-hr'} transform={`rotate(${i * 6} 50 50)`} />
      ))}
      <line x1="50" y1="56" x2="50" y2="27" className="sc-hand-h" transform={`rotate(${h * 30} 50 50)`} />
      <line x1="50" y1="58" x2="50" y2="15" className="sc-hand-m" transform={`rotate(${m * 6} 50 50)`} />
      <g transform={`rotate(${s * 6} 50 50)`} className="sc-hand-s">
        <line x1="50" y1="64" x2="50" y2="22" />
        <circle cx="50" cy="22" r="4.2" />
      </g>
      <circle cx="50" cy="50" r="1.6" className="sc-pin" />
    </svg>
  );
}

export function DigitalClock() {
  const now = new Date(useNow(1000));
  return <span className="mono digital-clock">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>;
}
