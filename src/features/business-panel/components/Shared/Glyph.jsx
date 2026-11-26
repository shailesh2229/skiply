import React from 'react';

// Line icons for the console (24×24, stroke 1.7). Keys are names; EMOJI maps legacy emoji to names.
const P = {
  plus: <path d="M12 5v14M5 12h14" />,
  pause: <><rect x="6.5" y="5" width="3.5" height="14" rx="1" /><rect x="14" y="5" width="3.5" height="14" rx="1" /></>,
  play: <path d="M7 5v14l12-7z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5M9.5 3h5M12 3v3" /></>,
  hourglass: <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" /><path d="M10 11v6M14 11v6" /></>,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  building: <><path d="M4 21V5l8-2v18M12 8h8v13M2 21h20" /><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="9.5" r="1.8" /><path d="m3.5 18 5.5-5.5 4 4 3-3 4.5 4.5" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  store: <><path d="M4 9h16l-1-5H5zM5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  smile: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></>,
  meh: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 15h7M9 9.5h.01M15 9.5h.01" /></>,
  frown: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 16a4 4 0 0 1 7 0M9 9.5h.01M15 9.5h.01" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  up: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  down: <><path d="m3 7 6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkc: <><circle cx="12" cy="12" r="8.5" /><path d="m8 12.3 2.8 2.7L16 9.5" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  xc: <><circle cx="12" cy="12" r="8.5" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  bulb: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" /></>,
  mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  users: <><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="7" r="2.5" /><path d="M2.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5M12.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  manager: <><circle cx="12" cy="7.5" r="3.5" /><path d="M5 21c.8-4 3.5-6.5 7-6.5s6.2 2.5 7 6.5M12 14.5l-1.2 2 1.2 4.5 1.2-4.5z" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M4 3.5V8h4.5M20 20.5V16h-4.5" /></>,
  walk: <><circle cx="13" cy="4.5" r="1.8" /><path d="m9 21 2.5-6.5L14 17v4M11.5 14.5 12.5 9l-3 1.5L8 14M12.5 9l2.5 3 3 1" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.4 3.6 5.2 3.6 8.5s-1.1 6.1-3.6 8.5c-2.5-2.4-3.6-5.2-3.6-8.5S9.5 5.9 12 3.5z" /></>,
  inbox: <><path d="M3 13.5 5.5 5h13l2.5 8.5V19H3z" /><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5" /></>,
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" />,
  alert: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.2h.01" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  coffee: <><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  receipt: <><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  print: <><path d="M7 9V3h10v6M7 17H4v-7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7h-3" /><path d="M7 14h10v7H7z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6 8.5 7 8.5-7" /></>,
  money: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.8" /><path d="M6 9.5v5M18 9.5v5" /></>,
  fire: <path d="M12 21c-4 0-7-2.7-7-6.5 0-3.4 2.4-5.4 4-7.5.4 2 1.6 3 2.6 3.4C11 7.5 12.5 5 14.5 3c.4 3.4 4.5 5.8 4.5 11.1 0 4-3 6.9-7 6.9z" />,
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
  box: <><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>,
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  door: <><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></>,
  tv: <><rect x="2.5" y="4.5" width="19" height="13" rx="2.5" /><path d="M8 21h8M12 17.5V21" /></>,
};

const EMOJI = {
  '➕': 'plus', '⏸': 'pause', '▶': 'play', '⏰': 'clock', '🕐': 'clock', '⏱': 'timer', '⏳': 'hourglass', '✏': 'edit', '🗑': 'trash',
  '💾': 'save', '📋': 'list', '🏢': 'building', '🖼': 'image', '📍': 'pin', '📞': 'phone', '📁': 'folder', '🏪': 'store',
  '⭐': 'star', '💬': 'chat', '😊': 'smile', '😐': 'meh', '😟': 'frown', '📊': 'chart', '📈': 'up', '📉': 'down',
  '📅': 'cal', '🗓': 'cal', '✅': 'checkc', '✓': 'check', '✗': 'x', '❌': 'xc', '💡': 'bulb', '🎯': 'target', '📱': 'mobile',
  '👥': 'users', '🧑': 'user', '👨': 'manager', '👁': 'eye', '🔄': 'refresh', '🚶': 'walk', '🌐': 'globe', '📭': 'inbox',
  '🔔': 'bell', '⚠': 'alert', '🏖': 'sun', '☕': 'coffee', '⚙': 'gear', '📄': 'doc', '🧾': 'receipt', '🖨': 'print',
  '📧': 'mail', '💰': 'money', '🔥': 'fire', '⚡': 'bolt', '📦': 'box', '🏠': 'home', '🚪': 'door',
};
const DOTS = { '🟢': 'go', '🟡': 'warn', '🔴': 'hot', '⚫': 'off' };

/** <Glyph n="chart" /> or <Glyph e="📊" />. Status-dot emoji render as small dots. */
export default function Glyph({ n, e, size = 18, className = '' }) {
  if (e) {
    const base = [...String(e)][0];
    if (DOTS[base]) return <span className={`gl-dot gl-${DOTS[base]} ${className}`} aria-hidden="true" />;
    n = EMOJI[base] || n;
  }
  if (!P[n]) return e ? <span className={className}>{e}</span> : null;
  return (
    <svg className={`gl ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>
  );
}

/** Stars as glyphs, e.g. rating 4 → ★★★★☆ */
export function Stars({ value, size = 14 }) {
  return (
    <span className="gl-stars" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < Math.round(value) ? 'on' : ''}><Glyph n="star" size={size} /></span>)}
    </span>
  );
}
