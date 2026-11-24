import { CATEGORIES } from '../data/categories';
import { parseHours, statusAt } from './hours';
import { hash01 } from './geo';

// Skiply's queue estimate for venues that haven't connected a live queue yet.
// Deterministic for a given venue + 5-minute window, so every visitor sees the same number.
export function hoursFor(place) {
  const cat = CATEGORIES[place.category];
  const mapped = parseHours(place.hours);
  if (mapped) return { parsed: mapped, source: 'osm' };
  return { parsed: parseHours(cat.typical), source: 'typical' };
}

export function estimateAt(place, date = new Date()) {
  const cat = CATEGORIES[place.category];
  const { parsed, source } = hoursFor(place);
  const status = statusAt(parsed, date);
  const size = 0.55 + hash01(place.id) * 0.9; // venue popularity factor
  const bucket = Math.floor(date.getTime() / 300000);
  const jitter = 0.85 + hash01(place.id + ':' + bucket) * 0.3;
  const wknd = [0, 6].includes(date.getDay()) ? cat.weekend : 1;
  let people = status.open === false ? 0 : Math.round(cat.peak * cat.curve[date.getHours()] * size * jitter * wknd);
  const counters = Math.max(1, Math.round(cat.counters * (0.7 + size * 0.4)));
  const wait = Math.round((people * cat.service) / counters);
  return { people, wait, counters, perPerson: cat.service / counters, status, hoursSource: source };
}

// 24-hour forecast for charts.
export function dayForecast(place, date = new Date()) {
  return Array.from({ length: 24 }, (_, h) => {
    const d = new Date(date); d.setHours(h, 30, 0, 0);
    return { hour: h, ...estimateAt(place, d) };
  });
}

export const fmtWait = (m) => (m <= 0 ? 'No wait' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);
