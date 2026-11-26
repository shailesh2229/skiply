// Passenger line reports, blended with Skiply's model.
// Reports live only on this device; they nudge the estimate, never replace it outright.
export const REPORT_WINDOW = 45 * 60000;

export const REPORT_BUCKETS = [
  { key: 'none', label: 'No line', people: 0 },
  { key: 'few', label: '1–5', people: 3 },
  { key: 'some', label: '6–15', people: 10 },
  { key: 'many', label: '16–30', people: 22 },
  { key: 'huge', label: '30+', people: 38 },
];

export const bucketLabel = (people) => (REPORT_BUCKETS.slice().reverse().find((b) => people >= b.people) || REPORT_BUCKETS[0]).label;

/** Reports still fresh enough to matter, newest first. */
export function freshReports(reports = [], now = Date.now()) {
  return reports.filter((r) => now - r.t >= 0 && now - r.t < REPORT_WINDOW);
}

/**
 * Blend model estimate with fresh reports.
 * Each report's line is projected forward (one person served every perPerson minutes since it was filed)
 * and weighted by recency: a brand-new report counts twice as much as the model, fading to zero at 45 min.
 */
export function blendEstimate(est, reports = [], now = Date.now()) {
  const fresh = freshReports(reports, now);
  if (!fresh.length || est.status?.open === false) return { ...est, reportCount: 0, adjusted: false };
  let wSum = 1, pSum = est.people;
  fresh.forEach((r) => {
    const ageMin = (now - r.t) / 60000;
    const projected = Math.max(0, r.people - ageMin / Math.max(0.5, est.perPerson || 1));
    const w = 2 * (1 - (now - r.t) / REPORT_WINDOW);
    wSum += w; pSum += w * projected;
  });
  const people = Math.round(pSum / wSum);
  const wait = Math.round(people * (est.perPerson || 1));
  return { ...est, people, wait, model: { people: est.people, wait: est.wait }, reportCount: fresh.length, adjusted: true };
}
