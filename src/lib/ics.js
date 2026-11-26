// Minimal iCalendar (RFC 5545) export for a Skiply ticket.
const pad = (n) => String(n).padStart(2, '0');
const stamp = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
// Lines longer than 75 octets must be folded.
const fold = (line) => line.match(/.{1,73}/g).join('\r\n ');

export function buildICS({ uid, title, start, durationMin = 20, location = '', description = '', url = '' }) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Skiply//Ticket//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@skiply`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + durationMin * 60000)}`,
    `SUMMARY:${esc(title)}`,
    location && `LOCATION:${esc(location)}`,
    description && `DESCRIPTION:${esc(description)}`,
    url && `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Skiply: time to head out', 'TRIGGER:-PT30M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(fold).join('\r\n');
}

export function ticketICS(ticket, start) {
  const url = `${window.location.origin}/place/${ticket.placeId}`;
  return buildICS({
    uid: ticket.id,
    title: `Skiply ${ticket.token} · ${ticket.placeName}`,
    start,
    location: ticket.address || ticket.placeName,
    description: `${ticket.department}\nToken ${ticket.token}${ticket.mode === 'live' ? '\nEstimated turn (Skiply estimate). Arrive a few minutes early.' : '\nBooked slot.'}\n${url}`,
    url,
  });
}

export function downloadICS(ticket, start) {
  const blob = new Blob([ticketICS(ticket, start)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `skiply-${ticket.token}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
