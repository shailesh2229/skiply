// Server-side proxy for Google Places (New) photos. Keeps GOOGLE_PLACES_KEY off the browser.
//   GET /api/venue-photo                     → { enabled }
//   GET /api/venue-photo?name=&lat=&lng=     → { photo: { url, width, height, attributions:[{name,uri}] } | null, placeId }
// Cost guards: per-IP rate limit + daily cap (GOOGLE_PHOTOS_DAILY_CAP, default 1500 lookups).
/* eslint-disable no-console */

const SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const key = () => process.env.GOOGLE_PLACES_KEY || '';
const CAP = () => Number(process.env.GOOGLE_PHOTOS_DAILY_CAP || 1500);

// ---- guards ----
const hits = new Map(); // ip -> [timestamps]
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 40; // 40 lookups per minute per visitor
}
let day = new Date().toDateString(), used = 0;
function overCap() {
  const d = new Date().toDateString();
  if (d !== day) { day = d; used = 0; }
  return used >= CAP();
}

// Short-lived memory cache: Google photo URLs shouldn't be stored long-term.
const cache = new Map();
const TTL = 6 * 3600 * 1000;
function remember(k, v) { cache.set(k, { t: Date.now(), v }); if (cache.size > 2000) cache.delete(cache.keys().next().value); }
function recall(k) { const c = cache.get(k); return c && Date.now() - c.t < TTL ? c.v : undefined; }

function distM(a, b) {
  const R = 6371000, r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const norm = (s = '') => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
function similar(a, b) {
  const A = new Set(norm(a)), B = norm(b);
  if (!A.size || !B.length) return 0;
  return B.filter((w) => A.has(w)).length / Math.max(A.size, B.length);
}

async function lookup({ name, lat, lng }) {
  const k = `${name}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
  const c = recall(k);
  if (c !== undefined) return c;
  if (overCap()) { const e = new Error('Daily photo limit reached'); e.code = 429; throw e; }
  used++;

  const r = await fetch(SEARCH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key(),
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.photos',
    },
    body: JSON.stringify({ textQuery: name, maxResultCount: 5, locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 400 } } }),
  });
  if (!r.ok) throw Object.assign(new Error(`Places search ${r.status}: ${(await r.text()).slice(0, 160)}`), { code: 502 });
  const j = await r.json();
  // Only accept the same place: close by and with a matching name.
  const best = (j.places || [])
    .map((p) => ({ p, d: distM({ lat, lng }, { lat: p.location?.latitude, lng: p.location?.longitude }), s: similar(name, p.displayName?.text) }))
    .filter((x) => x.p.photos?.length && x.d < 350 && (x.s >= 0.34 || x.d < 60))
    .sort((a, b) => b.s - a.s || a.d - b.d)[0];
  if (!best) { remember(k, null); return null; }

  const ph = best.p.photos[0];
  const m = await fetch(`https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=1000&skipHttpRedirect=true&key=${encodeURIComponent(key())}`);
  if (!m.ok) throw Object.assign(new Error(`Places photo ${m.status}`), { code: 502 });
  const mj = await m.json();
  const out = {
    placeId: best.p.id,
    googleName: best.p.displayName?.text || '',
    photo: {
      url: mj.photoUri, width: ph.widthPx, height: ph.heightPx,
      attributions: (ph.authorAttributions || []).map((a) => ({ name: a.displayName, uri: a.uri })),
    },
  };
  remember(k, out);
  return out;
}

async function handler(req, res) {
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  try {
    const u = new URL(req.url, 'http://x');
    const name = (u.searchParams.get('name') || '').trim().slice(0, 120);
    const lat = Number(u.searchParams.get('lat')), lng = Number(u.searchParams.get('lng'));
    if (!name) return send(200, { enabled: !!key() });
    if (!key()) return send(503, { error: 'GOOGLE_PLACES_KEY is not set' });
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return send(400, { error: 'lat/lng required' });
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return send(429, { error: 'Too many lookups, slow down' });
    const r = await lookup({ name, lat, lng });
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return send(200, r || { photo: null });
  } catch (e) {
    console.warn('[venue-photo]', e.message);
    return send(e.code || 502, { error: e.message });
  }
}

module.exports = { handler, lookup };
