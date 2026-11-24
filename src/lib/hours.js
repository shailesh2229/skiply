// Minimal parser for the common subset of OSM `opening_hours`:
//   "24/7" · "Mo-Sa 09:00-18:00" · "Mo-Fr 10:00-14:00,16:00-20:00; Su off" · "09:00-21:00"
// Returns null when the string uses syntax we don't understand.
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

function parseDays(spec) {
  const out = new Set();
  for (const part of spec.split(',')) {
    const p = part.trim();
    const m = p.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/);
    if (!m) { if (p === 'PH') continue; return null; }
    let i = DAYS.indexOf(m[1]); const j = DAYS.indexOf(m[2] || m[1]);
    for (;;) { out.add(i); if (i === j) break; i = (i + 1) % 7; }
  }
  return out;
}

export function parseHours(raw) {
  if (!raw) return null;
  const s = raw.trim();
  const week = Array.from({ length: 7 }, () => []);
  if (s === '24/7' || /^Mo-Su 00:00-(24|23:59)(:00)?$/.test(s)) {
    for (let d = 0; d < 7; d++) week[d] = [[0, 1440]];
    return { week, always: true };
  }
  for (const ruleRaw of s.split(';')) {
    const rule = ruleRaw.trim();
    if (!rule) continue;
    const m = rule.match(/^(?:([A-Za-z,\- ]+?)\s+)?(off|closed|[\d:,\- ]+)$/);
    if (!m) return null;
    const days = m[1] ? parseDays(m[1].replace(/\s+/g, '')) : new Set([0, 1, 2, 3, 4, 5, 6]);
    if (!days) return null;
    const body = m[2].trim();
    const ranges = [];
    if (body !== 'off' && body !== 'closed') {
      for (const r of body.split(',')) {
        const t = r.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
        if (!t) return null;
        let a = toMin(t[1]), b = toMin(t[2]);
        if (b <= a) b += 1440; // past midnight
        ranges.push([a, b]);
      }
    }
    days.forEach((d) => { week[d] = ranges; }); // later rules override earlier ones
  }
  return { week, always: false };
}

const dayIdx = (date) => (date.getDay() + 6) % 7; // Monday = 0

export function statusAt(parsed, date = new Date()) {
  if (!parsed) return { known: false };
  if (parsed.always) return { known: true, open: true, label: 'Open 24 hours' };
  const d = dayIdx(date), mins = date.getHours() * 60 + date.getMinutes();
  const prev = (d + 6) % 7;
  const inRange = (r, offset) => mins + offset >= r[0] && mins + offset < r[1];
  const cur = parsed.week[d].find((r) => inRange(r, 0)) || parsed.week[prev].find((r) => r[1] > 1440 && inRange(r, 1440));
  if (cur) {
    const closesIn = (cur[1] - (cur[0] > mins ? mins + 1440 : mins));
    return { known: true, open: true, closesIn, label: `Open · closes ${fmtMin(cur[1] % 1440)}` };
  }
  for (let k = 0; k < 7; k++) {
    const day = (d + k) % 7;
    const next = parsed.week[day].filter((r) => k > 0 || r[0] > mins).sort((a, b) => a[0] - b[0])[0];
    if (next) return { known: true, open: false, label: `Closed · opens ${k === 0 ? '' : k === 1 ? 'tomorrow ' : DAY_NAMES[day].slice(0, 3) + ' '}${fmtMin(next[0])}` };
  }
  return { known: true, open: false, label: 'Closed' };
}

export function fmtMin(m) {
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`;
}

export function rangesForDate(parsed, date) {
  return parsed ? parsed.week[dayIdx(date)] : [];
}
