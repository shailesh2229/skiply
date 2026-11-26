// Real photographs of a specific venue, from open sources only:
//   1. OpenStreetMap `image` / `wikimedia_commons` tags on the venue itself
//   2. the venue's Wikidata item (P18 "image")
//   3. Google Places photo of the same business (only when the site owner set GOOGLE_PLACES_KEY;
//      fetched through our /api/venue-photo proxy, kept for this browser session only)
//   4. Wikimedia Commons photos geotagged within ~120 m whose file name names the venue
// Anything else falls back to a clearly-labelled representative photo (see data/photos.js).
// Commons photos are freely licensed (mostly CC BY-SA), so we keep author + licence for credit.

const API = 'https://commons.wikimedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';
const TTL_HIT = 30 * 864e5, TTL_MISS = 7 * 864e5;
const mem = new Map(); // id -> result | null | Promise

// Google on/off is part of the key, so turning Google on re-checks venues that had no open-data photo.
let google = null; // null = unknown, true/false once checked
const ck = (id) => `skiply.vphoto2.${google ? 'g' : 'o'}.${id}`;
function cacheGet(id) {
  try {
    const s = JSON.parse(sessionStorage.getItem(ck(id)));
    if (s) return s.d;
    const v = JSON.parse(localStorage.getItem(ck(id)));
    if (v && Date.now() - v.t < (v.d ? TTL_HIT : TTL_MISS)) return v.d;
  } catch (e) { /* storage unavailable */ }
  return undefined;
}
function cacheSet(id, d) {
  try {
    // Google photo links are short-lived and Google's terms limit caching: keep them for this session only.
    if (d?.source === 'google') sessionStorage.setItem(ck(id), JSON.stringify({ d }));
    else localStorage.setItem(ck(id), JSON.stringify({ t: Date.now(), d }));
  } catch (e) { /* full */ }
}

let googleCheck;
function googleEnabled() {
  if (!googleCheck) {
    googleCheck = fetch('/api/venue-photo').then((r) => (r.ok ? r.json() : {})).then((j) => !!j.enabled).catch(() => false)
      .then((on) => { google = on; return on; });
  }
  return googleCheck;
}
if (typeof window !== 'undefined') googleEnabled();

async function fromGoogle(place) {
  if (!(await googleEnabled())) return null;
  const r = await queued(() => fetch(`/api/venue-photo?${new URLSearchParams({ name: place.name, lat: place.lat, lng: place.lng })}`));
  if (!r.ok) throw Object.assign(new Error(`venue-photo ${r.status}`), { transient: true });
  const j = await r.json();
  if (!j.photo?.url) return null;
  const a = j.photo.attributions || [];
  return {
    url: j.photo.url, thumb: j.photo.url, source: 'google',
    author: a.map((x) => x.name).filter(Boolean).join(', ') || 'Google user',
    license: 'Google Maps', page: a[0]?.uri || `https://www.google.com/maps/place/?q=place_id:${j.placeId}`,
  };
}

// ---- polite request queue: at most 3 at a time ----
let active = 0;
const waiting = [];
function queued(fn) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active++;
      try { resolve(await fn()); } catch (e) { reject(e); } finally { active--; waiting.shift()?.(); }
    };
    if (active < 3) run(); else waiting.push(run);
  });
}
const getJSON = (base, params) => queued(async () => {
  const q = new URLSearchParams({ format: 'json', origin: '*', ...params });
  const r = await fetch(`${base}?${q}`);
  if (!r.ok) throw new Error(`photos ${r.status}`);
  return r.json();
});

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** File titles → [{ url, thumb, author, license, page, title }] */
async function fileInfo(titles, width) {
  if (!titles.length) return [];
  const j = await getJSON(API, {
    action: 'query', titles: titles.slice(0, 20).join('|'), prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size', iiurlwidth: String(width),
  });
  return Object.values(j.query?.pages || {}).filter((p) => p.imageinfo?.[0]).map((p) => {
    const i = p.imageinfo[0], m = i.extmetadata || {};
    return {
      title: p.title, url: i.url, thumb: i.thumburl || i.url, mime: i.mime, w: i.width, h: i.height,
      author: strip(m.Artist?.value).slice(0, 80) || 'Wikimedia Commons contributor',
      license: m.LicenseShortName?.value || 'see file page',
      page: i.descriptionurl,
    };
  }).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.mime) && f.w >= 400);
}

// Words that say nothing about which venue this is.
const STOP = new Set(('hospital hospitals clinic clinics bank branch the and of pvt private ltd limited centre center medical '
  + 'health care multispeciality multi speciality super specialty diagnostic diagnostics dental nursing home post office '
  + 'pharmacy chemist medical store salon beauty parlour hair restaurant cafe hotel india indian new old road main '
  + 'shri sri shree dr doctor').split(' '));
const tokens = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w));

function nameMatches(title, place) {
  const t = title.toLowerCase().replace(/[_-]/g, ' ');
  const toks = tokens(place.name);
  if (!toks.length) return false;
  const hits = toks.filter((w) => t.includes(w)).length;
  return hits >= Math.min(2, toks.length);
}

async function fromTags(place, width) {
  if (place.commons) {
    const c = place.commons.trim();
    if (/^File:/i.test(c)) { const [f] = await fileInfo([c], width); if (f) return { ...f, source: 'osm' }; }
    if (/^Category:/i.test(c)) {
      const j = await getJSON(API, { action: 'query', list: 'categorymembers', cmtitle: c, cmtype: 'file', cmlimit: '8' });
      const [f] = await fileInfo((j.query?.categorymembers || []).map((m) => m.title), width);
      if (f) return { ...f, source: 'osm' };
    }
  }
  if (place.wikidata) {
    const j = await getJSON(WD, { action: 'wbgetclaims', entity: place.wikidata, property: 'P18' });
    const file = j.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (file) { const [f] = await fileInfo([`File:${file}`], width); if (f) return { ...f, source: 'wikidata' }; }
  }
  if (place.image && /\.(jpe?g|png|webp)(\?|$)/i.test(place.image)) {
    return { url: place.image, thumb: place.image, author: 'OpenStreetMap contributor', license: 'see source', page: place.image, source: 'osm-link' };
  }
  return null;
}

async function fromNearby(place, width) {
  const j = await getJSON(API, { action: 'query', list: 'geosearch', gscoord: `${place.lat}|${place.lng}`, gsradius: '120', gsnamespace: '6', gslimit: '40' });
  const near = (j.query?.geosearch || []).filter((g) => nameMatches(g.title, place)).sort((a, b) => a.dist - b.dist);
  const files = await fileInfo(near.slice(0, 6).map((g) => g.title), width);
  const f = files[0];
  return f ? { ...f, source: 'commons-nearby', dist: Math.round(near.find((g) => g.title === f.title)?.dist || 0) } : null;
}

/**
 * Real photo of this exact venue, or null when none exists in open data.
 * Result: { thumb, url, author, license, page, source }
 */
export function findVenuePhoto(place, width = 800) {
  if (!place?.id || place.lat == null) return Promise.resolve(null);
  const id = place.id;
  if (mem.has(id)) return Promise.resolve(mem.get(id));
  const job = (async () => {
    await googleEnabled();
    const c = cacheGet(id);
    if (c !== undefined) { mem.set(id, c); return c; }
    let r = null, transient = false;
    const step = async (fn) => { try { return await fn(); } catch (e) { transient = true; return null; } };
    r = (await step(() => fromTags(place, width))) || (await step(() => fromGoogle(place))) || (await step(() => fromNearby(place, width)));
    mem.set(id, r);
    if (r || !transient) cacheSet(id, r); // don't remember "no photo" after a network error or a hit limit
    return r;
  })();
  mem.set(id, job);
  return job;
}

export function cachedVenuePhoto(id) {
  const m = mem.get(id);
  if (m && typeof m.then !== 'function') return m;
  if (google === null) return undefined; // not sure yet which cache applies
  const c = cacheGet(id);
  return c === undefined ? undefined : c;
}
