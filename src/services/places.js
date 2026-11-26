// Real venues from OpenStreetMap.
//   Primary:  Overpass API (one query for every category around a point)
//   Fallback: Nominatim search, one category at a time (respecting its 1 req/s policy)
import { categoryFromTags, CATEGORY_LIST } from '../data/categories';
import { distanceKm } from '../lib/geo';

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const memory = new Map(); // id -> place, shared across pages

// ---------- helpers ----------
let lastNominatim = 0;
async function nominatim(path) {
  const wait = Math.max(0, lastNominatim + 1100 - Date.now());
  lastNominatim = Date.now() + wait;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const res = await fetch(`${NOMINATIM}${path}${path.includes('?') ? '&' : '?'}accept-language=en`);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

function cacheGet(key) {
  try {
    const v = JSON.parse(sessionStorage.getItem(key));
    if (v && Date.now() - v.t < 30 * 60 * 1000) return v.d;
  } catch (e) { /* storage unavailable */ }
  return null;
}
function cacheSet(key, d) {
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) { /* full or blocked */ }
}

function addressFromTags(t) {
  const line = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  return [t['addr:housename'], line, t['addr:suburb'] || t['addr:neighbourhood'], t['addr:city'], t['addr:postcode']]
    .filter(Boolean).join(', ');
}

function addressFromNominatim(a = {}) {
  return [a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road, a.neighbourhood || a.suburb || a.quarter,
    a.city || a.town || a.village || a.state_district, a.postcode].filter(Boolean).join(', ');
}

function normalize({ type, id, lat, lng, tags, address }) {
  const category = categoryFromTags(tags);
  if (!category || !tags.name) return null;
  const pid = `${type[0]}${id}`;
  const place = {
    id: pid, osmType: type, osmId: id, category, lat, lng,
    name: tags['name:en'] || tags.name,
    localName: tags['name:en'] && tags.name !== tags['name:en'] ? tags.name : null,
    address: address || addressFromTags(tags),
    hours: tags.opening_hours || null,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    wheelchair: tags.wheelchair || null,
    operator: tags.operator || tags.brand || null,
    speciality: tags['healthcare:speciality'] || tags.cuisine || null,
    emergency: tags.emergency || null,
    // photo hints mapped by OSM volunteers
    image: /^https:\/\//.test(tags.image || '') ? tags.image : null,
    commons: tags.wikimedia_commons || null,
    wikidata: /^Q\d+$/.test(tags.wikidata || '') ? tags.wikidata : null,
  };
  const prev = memory.get(pid);
  const merged = prev ? { ...prev, ...Object.fromEntries(Object.entries(place).filter(([, v]) => v)) } : place;
  memory.set(pid, merged);
  return merged;
}

// ---------- nearby ----------
async function overpassNearby(lat, lng, radius, signal) {
  const around = `(around:${radius},${lat},${lng})`;
  const q = `[out:json][timeout:20];(
    nwr["amenity"~"^(hospital|clinic|doctors|dentist|bank|restaurant|pharmacy|post_office)$"]["name"]${around};
    nwr["shop"~"^(hairdresser|beauty|chemist)$"]["name"]${around};
  );out center tags 400;`;
  let lastErr;
  for (const url of OVERPASS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    signal?.addEventListener('abort', () => ctrl.abort());
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }), signal: ctrl.signal });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = await res.json();
      clearTimeout(timer);
      return json.elements.map((e) => normalize({
        type: e.type, id: e.id, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, tags: e.tags || {},
      })).filter(Boolean);
    } catch (e) {
      clearTimeout(timer);
      if (signal?.aborted) throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

const NOMINATIM_TERMS = {
  hospital: 'hospital', clinic: 'clinic', bank: 'bank', salon: 'hairdresser',
  restaurant: 'restaurant', pharmacy: 'pharmacy', post_office: 'post office',
};

function fromNominatim(r) {
  return normalize({
    type: r.osm_type, id: r.osm_id, lat: +r.lat, lng: +r.lon,
    tags: { [r.category]: r.type, name: r.name || r.namedetails?.name, 'name:en': r.namedetails?.['name:en'], ...(r.extratags || {}) },
    address: addressFromNominatim(r.address),
  });
}

async function nominatimNearby(lat, lng, radiusM, onProgress, signal) {
  const d = radiusM / 111000, dl = d / Math.cos((lat * Math.PI) / 180);
  const box = `${lng - dl},${lat + d},${lng + dl},${lat - d}`;
  const all = [];
  for (const cat of CATEGORY_LIST) {
    if (signal?.aborted) break;
    try {
      const rows = await nominatim(`/search?format=jsonv2&q=${encodeURIComponent(NOMINATIM_TERMS[cat.key])}&viewbox=${box}&bounded=1&limit=40&extratags=1&addressdetails=1&namedetails=1`);
      all.push(...rows.map(fromNominatim).filter(Boolean));
      onProgress?.([...all], cat);
    } catch (e) { /* skip this category */ }
  }
  return all;
}

function finish(list, origin) {
  const seen = new Set();
  return list
    .filter((p) => p.lat && !seen.has(p.id) && seen.add(p.id))
    .map((p) => ({ ...p, distance: distanceKm(origin, p) }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Venues near a point. `onProgress(list, source)` streams partial results.
 * Resolves to { places, source: 'overpass' | 'nominatim' }.
 */
export async function fetchNearby({ lat, lng }, { radius = 3000, onProgress, signal } = {}) {
  const key = `skiply.near2.${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
  const origin = { lat, lng };
  const cached = cacheGet(key);
  if (cached) { cached.places.forEach((p) => memory.set(p.id, p)); return cached; }

  let out;
  try {
    out = { places: finish(await overpassNearby(lat, lng, radius, signal), origin), source: 'overpass' };
  } catch (e) {
    if (signal?.aborted) throw e;
    const list = await nominatimNearby(lat, lng, radius + 1000, (l) => onProgress?.(finish(l, origin), 'nominatim'), signal);
    out = { places: finish(list, origin), source: 'nominatim' };
  }
  if (out.places.length) cacheSet(key, out);
  return out;
}

// ---------- single venue ----------
export function cachedPlace(pid) { return memory.get(pid) || null; }

export async function fetchPlace(pid) {
  const key = `skiply.place2.${pid}`;
  const cached = cacheGet(key);
  if (cached) { memory.set(pid, cached); return cached; }
  const T = { n: 'N', w: 'W', r: 'R' }[pid[0]];
  if (!T || !/^\d+$/.test(pid.slice(1))) return null;
  const rows = await nominatim(`/lookup?format=jsonv2&osm_ids=${T}${pid.slice(1)}&extratags=1&addressdetails=1&namedetails=1`);
  const place = rows[0] ? fromNominatim(rows[0]) : null;
  if (place) cacheSet(key, place);
  return place;
}

// ---------- free text ----------
export async function searchVenues(query, { lat, lng }) {
  const d = 0.25;
  const rows = await nominatim(`/search?format=jsonv2&q=${encodeURIComponent(query)}&viewbox=${lng - d},${lat + d},${lng + d},${lat - d}&bounded=1&limit=30&extratags=1&addressdetails=1&namedetails=1&countrycodes=in`);
  return finish(rows.map(fromNominatim).filter(Boolean), { lat, lng });
}

export async function searchLocalities(query) {
  const rows = await nominatim(`/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=1`);
  return rows.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    detail: r.display_name.split(',').slice(1, 4).join(',').trim(),
    lat: +r.lat, lng: +r.lon,
  }));
}

export async function reverseLocality(lat, lng) {
  const r = await nominatim(`/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
  const a = r.address || {};
  return a.suburb || a.neighbourhood || a.city_district || a.city || a.town || a.village || 'Your location';
}
