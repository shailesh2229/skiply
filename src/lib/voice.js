// Skiply voice: station-style announcements in English, Hindi and Gujarati.
// Uses the most natural voice the device has. Edge ships Microsoft "Natural"
// neural voices (en-IN Neerja, hi-IN Swara, gu-IN Dhwani) and Chrome ships
// Google voices; those sound close to a real person. Novelty voices are skipped.
import { load } from './storage';

export const LANGS = {
  en: { key: 'en', label: 'English', native: 'English', bcp: 'en-IN', alt: ['en-GB', 'en-US', 'en'] },
  hi: { key: 'hi', label: 'Hindi', native: 'हिन्दी', bcp: 'hi-IN', alt: ['hi'] },
  gu: { key: 'gu', label: 'Gujarati', native: 'ગુજરાતી', bcp: 'gu-IN', alt: ['gu'] },
};
// Indian stations announce Hindi → English → regional language.
export const ALL_ORDER = ['hi', 'en', 'gu'];

const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Fred|Good News|Jester|Junior|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Grandma|Grandpa|Rocko|Kathy)\b/i;

let cache = [];
function refresh() {
  if (!('speechSynthesis' in window)) return [];
  cache = window.speechSynthesis.getVoices();
  return cache;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => { refresh(); window.dispatchEvent(new Event('skiply:voices')); });
}

/** 0–100: how human a voice is likely to sound. */
export function quality(v) {
  const n = v.name;
  if (NOVELTY.test(n)) return 0;
  let q = 30;
  if (/natural|neural|wavenet|studio|journey/i.test(n)) q += 60;
  else if (/online/i.test(n)) q += 45;
  else if (/google/i.test(n)) q += 40;
  if (/premium|enhanced|siri/i.test(n)) q += 35;
  if (!v.localService) q += 5;
  return Math.min(100, q);
}
export const qualityLabel = (v) => (quality(v) >= 75 ? 'Natural' : quality(v) >= 55 ? 'Clear' : 'Basic');

export function voicesFor(lang) {
  const L = LANGS[lang];
  const list = (cache.length ? cache : refresh()).filter((v) => !NOVELTY.test(v.name));
  const exact = list.filter((v) => v.lang?.replace('_', '-') === L.bcp);
  const loose = list.filter((v) => !exact.includes(v) && L.alt.some((a) => v.lang?.replace('_', '-').startsWith(a)));
  // For English prefer Indian English, then others, best quality first
  return [...exact, ...loose].sort((a, b) => quality(b) + (exact.includes(b) ? 15 : 0) - quality(a) - (exact.includes(a) ? 15 : 0));
}

export function pickVoice(lang) {
  const chosen = load('skiply.settings', {}).voices?.[lang];
  const list = voicesFor(lang);
  return list.find((v) => v.name === chosen) || list[0] || null;
}

export const hasVoice = (lang) => !!pickVoice(lang);

// ---------- cloud neural voice (server proxy at /api/tts) ----------
let cloud = { checked: false, provider: null };
export function cloudInfo() { return cloud; }
export async function checkCloud(force = false) {
  if (cloud.checked && !force) return cloud;
  try {
    const r = await fetch('/api/tts', { headers: { Accept: 'application/json' } });
    const j = r.ok ? await r.json() : {};
    cloud = { checked: true, provider: j.provider || null, voices: j.voices || null };
  } catch (e) { cloud = { checked: true, provider: null }; }
  window.dispatchEvent(new Event('skiply:voices'));
  return cloud;
}
if (typeof window !== 'undefined') checkCloud();

const cloudOn = () => !!cloud.provider && load('skiply.settings', {}).cloudVoice !== false;
const clips = new Map(); // lang|gender|text -> object URL
let current = null;

async function cloudClip(text, lang) {
  const gender = load('skiply.settings', {}).voiceGender === 'male' ? 'male' : 'female';
  const key = `${lang}|${gender}|${text}`;
  if (clips.has(key)) return clips.get(key);
  const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang, gender }) });
  if (!r.ok) throw new Error(`tts ${r.status}`);
  const url = URL.createObjectURL(await r.blob());
  clips.set(key, url);
  if (clips.size > 60) { const [k, u] = clips.entries().next().value; URL.revokeObjectURL(u); clips.delete(k); }
  return url;
}

function playUrl(url) {
  return new Promise((resolve, reject) => {
    const a = new Audio(url);
    current = a;
    a.onended = () => resolve();
    a.onerror = () => reject(new Error('audio error'));
    a.play().catch(reject);
  });
}

/** Warm the cache so the next announcement starts instantly. */
export function preload(lines, mode) {
  if (!cloudOn()) return;
  const langs = (mode === 'all' ? ALL_ORDER : [mode || 'en']).filter((l) => lines[l]);
  langs.forEach((l) => cloudClip(lines[l], l).catch(() => {}));
}

// ---------- speaking ----------
let queue = [];
let busy = false;

function utter(text, voice, lang) {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || LANGS[lang].bcp;
    const natural = voice && quality(voice) >= 75;
    // Neural voices already sound human at 1.0; basic voices sound warmer slightly slower & lower.
    u.rate = natural ? 1 : lang === 'en' ? 0.92 : 0.9;
    u.pitch = natural ? 1 : 0.98;
    u.volume = 1;
    let done = false;
    const end = () => { if (!done) { done = true; resolve(); } };
    u.onend = end; u.onerror = end;
    // Safari sometimes never fires onend
    setTimeout(end, 1500 + text.length * 120);
    window.speechSynthesis.speak(u);
  });
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Split into sentences so long announcements don't get cut off and breathe like a person.
const sentences = (t) => t.match(/[^.!?।]+[.!?।]?/g)?.map((s) => s.trim()).filter(Boolean) || [t];

let gen = 0; // bumps on interrupt so an older run stops at its next step

async function run() {
  if (busy) return;
  busy = true;
  const my = gen;
  while (queue.length && my === gen) {
    const job = queue.shift();
    for (let i = 0; i < job.length && my === gen; i++) {
      const { lang, text } = job[i];
      let done = false;
      if (cloudOn()) {
        try { await playUrl(await cloudClip(text, lang)); done = true; } catch (e) { /* fall back to the device voice */ }
      }
      if (my !== gen) return;
      if (!done && hasVoice(lang)) {
        const v = pickVoice(lang);
        for (const s of sentences(text)) { if (my !== gen) return; await utter(s, v, lang); await pause(180); }
      }
      if (i < job.length - 1) await pause(650);
    }
  }
  if (my === gen) busy = false;
}

/**
 * Announce a message given in several languages: { en, hi, gu }.
 * mode: 'en' | 'hi' | 'gu' | 'all'. Falls back to English when a language has no voice on this device.
 */
export function announce(lines, { mode, force = false, interrupt = true } = {}) {
  const s = load('skiply.settings', {});
  if (!force && !s.voice) return { spoken: [] };
  const m = mode || s.voiceLang || 'en';
  let langs = m === 'all' ? ALL_ORDER : [m];
  langs = langs.filter((l) => lines[l]);
  const can = (l) => cloudOn() || hasVoice(l);
  const missing = langs.filter((l) => !can(l));
  langs = langs.filter(can);
  if (!langs.length && lines.en) langs = ['en'];
  if (interrupt) { gen++; window.speechSynthesis?.cancel(); current?.pause(); queue = []; busy = false; }
  queue.push(langs.map((l) => ({ lang: l, text: lines[l] })));
  run();
  return { spoken: langs, missing };
}

export function stopSpeaking() { gen++; queue = []; busy = false; current?.pause(); window.speechSynthesis?.cancel(); }

// ---------- words ----------
export const CAT_WORDS = {
  hospital: { en: 'hospitals', hi: 'अस्पताल', gu: 'હોસ્પિટલ' },
  clinic: { en: 'clinics', hi: 'क्लिनिक', gu: 'ક્લિનિક' },
  bank: { en: 'banks', hi: 'बैंक', gu: 'બેંક' },
  salon: { en: 'salons', hi: 'सैलून', gu: 'સલૂન' },
  restaurant: { en: 'restaurants', hi: 'रेस्टोरेंट', gu: 'રેસ્ટોરન્ટ' },
  pharmacy: { en: 'pharmacies', hi: 'दवा की दुकानें', gu: 'દવાની દુકાનો' },
  post_office: { en: 'post offices', hi: 'डाकघर', gu: 'પોસ્ટ ઓફિસ' },
};

/** Minutes in words for each language. */
export function waitWords(m) {
  if (m <= 0) return { en: 'no wait', hi: 'कोई प्रतीक्षा नहीं', gu: 'કોઈ રાહ નહીં' };
  const h = Math.floor(m / 60), mm = m % 60;
  if (!h) return { en: `${m} minute${m === 1 ? '' : 's'}`, hi: `${m} मिनट`, gu: `${m} મિનિટ` };
  return {
    en: `${h} hour${h > 1 ? 's' : ''}${mm ? ` ${mm} minutes` : ''}`,
    hi: `${h} घंटे${mm ? ` ${mm} मिनट` : ''}`,
    gu: `${h} કલાક${mm ? ` ${mm} મિનિટ` : ''}`,
  };
}

/** "H-051" → "H 51" so every voice reads it like an announcer. */
export const tokenWords = (t = '') => { const [a, b] = t.split('-'); return b ? `${a} ${parseInt(b, 10)}` : t; };

export const SAMPLE = {
  en: 'Attention please. Token H 51, please proceed to counter number two. Thank you for using Skiply.',
  hi: 'यात्रीगण कृपया ध्यान दें। टोकन नंबर H 51, कृपया काउंटर नंबर दो पर पधारें। स्किपली का उपयोग करने के लिए धन्यवाद।',
  gu: 'મુસાફરો કૃપા કરી ધ્યાન આપે. ટોકન નંબર H 51, કૃપા કરી કાઉન્ટર નંબર બે પર પધારો. સ્કિપ્લીનો ઉપયોગ કરવા બદલ આભાર.',
};
