// Errand Run: pick a venue per category and an order that minimises
// travel + estimated wait + service, using Skiply's queue model at each arrival time.
import { CATEGORIES } from '../data/categories';
import { estimateAt } from './estimate';
import { distanceKm } from './geo';

export const MODES = {
  walk: { key: 'walk', label: 'Walk', kmh: 4.5, overhead: 0, verb: 'walk' },
  auto: { key: 'auto', label: 'Auto / bike', kmh: 18, overhead: 4, verb: 'ride' },
  car: { key: 'car', label: 'Car', kmh: 22, overhead: 6, verb: 'drive' },
};

const DETOUR = 1.3; // streets are not straight lines

export function travelMin(a, b, mode) {
  const m = MODES[mode] || MODES.walk;
  const km = distanceKm(a, b) * DETOUR;
  return { km, min: Math.max(1, Math.round((km / m.kmh) * 60 + m.overhead)) };
}

/** Nearest `n` venues of a category that are open at `date`, by distance from `origin`. */
export function candidatesFor(places, cat, origin, date, n = 4) {
  return places
    .filter((p) => p.category === cat)
    .map((p) => ({ p, d: distanceKm(origin, p) }))
    .sort((a, b) => a.d - b.d)
    .filter(({ p }) => estimateAt(p, date).status.open !== false)
    .slice(0, n)
    .map(({ p }) => p);
}

function makeEstimator() {
  const memo = new Map();
  return (p, ms) => {
    const k = `${p.id}:${Math.floor(ms / 300000)}`;
    if (!memo.has(k)) memo.set(k, estimateAt(p, new Date(ms)));
    return memo.get(k);
  };
}

/** Walk a fixed sequence of venues; returns null if any stop is closed when you get there. */
export function simulate(seq, origin, startMs, mode, est = makeEstimator()) {
  let t = startMs, at = origin;
  const stops = [];
  for (const p of seq) {
    const leg = travelMin(at, p, mode);
    const arrive = t + leg.min * 60000;
    const e = est(p, arrive);
    if (e.status.open === false) return null;
    const service = CATEGORIES[p.category].service;
    const leave = arrive + (e.wait + service) * 60000;
    stops.push({ place: p, leg, arrive, wait: e.wait, people: e.people, service, leave, estimate: e });
    t = leave; at = p;
  }
  const travel = stops.reduce((s, x) => s + x.leg.min, 0);
  const wait = stops.reduce((s, x) => s + x.wait, 0);
  const service = stops.reduce((s, x) => s + x.service, 0);
  return { stops, start: startMs, end: t, total: Math.round((t - startMs) / 60000), travel, wait, service, km: stops.reduce((s, x) => s + x.leg.km, 0) };
}

/**
 * Best plan over every order × candidate choice (branch and bound).
 * cats: category keys in the order the passenger picked them.
 * locks: { [cat]: placeId } to force a specific venue.
 */
export function optimise({ places, cats, locks = {}, origin, startMs, mode, budget: maxNodes = 120000 }) {
  const est = makeEstimator();
  const start = new Date(startMs);
  const pools = {};
  for (const c of cats) {
    const locked = locks[c] && places.find((p) => p.id === locks[c]);
    pools[c] = locked ? [locked] : candidatesFor(places, c, origin, start, cats.length >= 5 ? 3 : 4);
    if (!pools[c].length) return { error: 'none', cat: c };
  }

  let best = null;
  const n = cats.length;
  const used = new Array(n).fill(false);
  const seq = [];
  let budget = maxNodes;

  const dfs = (t, at, elapsed) => {
    if (budget-- <= 0) return;
    if (best && elapsed >= best.total) return; // bound
    if (seq.length === n) { best = { total: elapsed, seq: [...seq] }; return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const cat = cats[i];
      for (const p of pools[cat]) {
        const leg = travelMin(at, p, mode);
        const arrive = t + leg.min * 60000;
        const e = est(p, arrive);
        if (e.status.open === false) continue;
        const leave = arrive + (e.wait + CATEGORIES[cat].service) * 60000;
        used[i] = true; seq.push(p);
        dfs(leave, p, Math.round((leave - startMs) / 60000));
        used[i] = false; seq.pop();
      }
    }
  };
  dfs(startMs, origin, 0);
  if (!best) return { error: 'closed' };
  const plan = simulate(best.seq, origin, startMs, mode, est);

  // Naive: the nearest open venue of each, in the order picked.
  const naiveSeq = cats.map((c) => {
    const locked = locks[c] && places.find((p) => p.id === locks[c]);
    return locked || candidatesFor(places, c, origin, start, 1)[0];
  }).filter(Boolean);
  const naive = naiveSeq.length === n ? simulate(naiveSeq, origin, startMs, mode, est) : null;
  return { plan, naive, pools };
}
