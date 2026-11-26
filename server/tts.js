// Server-side text-to-speech proxy. Keeps the provider key off the browser.
// Providers (first one configured wins, or force with TTS_PROVIDER=azure|google):
//   Azure Speech  — AZURE_SPEECH_KEY + AZURE_SPEECH_REGION   (recommended: best Gujarati)
//   Google Cloud  — GOOGLE_TTS_KEY
/* eslint-disable no-console */

const VOICES = {
  azure: {
    female: { en: 'en-IN-NeerjaNeural', hi: 'hi-IN-SwaraNeural', gu: 'gu-IN-DhwaniNeural' },
    male: { en: 'en-IN-PrabhatNeural', hi: 'hi-IN-MadhurNeural', gu: 'gu-IN-NiranjanNeural' },
  },
  google: {
    female: { en: 'en-IN-Neural2-A', hi: 'hi-IN-Neural2-A', gu: 'gu-IN-Wavenet-A' },
    male: { en: 'en-IN-Neural2-B', hi: 'hi-IN-Neural2-B', gu: 'gu-IN-Wavenet-B' },
  },
};
const BCP = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };
const MAX = 700;

function provider() {
  const forced = (process.env.TTS_PROVIDER || '').toLowerCase();
  const azure = !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
  const google = !!process.env.GOOGLE_TTS_KEY;
  if (forced === 'azure' && azure) return 'azure';
  if (forced === 'google' && google) return 'google';
  if (azure) return 'azure';
  if (google) return 'google';
  return null;
}

const xml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

async function azure(text, lang, voice) {
  const region = process.env.AZURE_SPEECH_REGION;
  // A touch slower with short breaths between sentences: sounds like a real announcer.
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${BCP[lang]}">`
    + `<voice name="${voice}"><mstts:silence type="Sentenceboundary" value="320ms"/><prosody rate="-6%">${xml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'skiply-web',
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function google(text, lang, voice) {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: BCP[lang], name: voice },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, sampleRateHertz: 24000 },
    }),
  });
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return Buffer.from(json.audioContent, 'base64');
}

const cache = new Map(); // small in-memory cache: repeated tokens/phrases are free
function remember(k, v) { cache.set(k, v); if (cache.size > 300) cache.delete(cache.keys().next().value); }

/** GET status → { provider, voices } */
function status() {
  const p = provider();
  return { provider: p, voices: p ? VOICES[p] : null, langs: Object.keys(BCP) };
}

/** Returns { audio: Buffer, type } or throws { code, message }. */
async function synth({ text, lang = 'en', gender = 'female' }) {
  const p = provider();
  if (!p) { const e = new Error('No cloud voice configured. Add AZURE_SPEECH_KEY + AZURE_SPEECH_REGION (or GOOGLE_TTS_KEY) to .env.local.'); e.code = 503; throw e; }
  if (!BCP[lang]) { const e = new Error('Unsupported language'); e.code = 400; throw e; }
  const t = String(text || '').trim().slice(0, MAX);
  if (!t) { const e = new Error('Empty text'); e.code = 400; throw e; }
  const voice = VOICES[p][gender === 'male' ? 'male' : 'female'][lang];
  const key = `${p}|${voice}|${t}`;
  if (cache.has(key)) return { audio: cache.get(key), type: 'audio/mpeg' };
  const audio = p === 'azure' ? await azure(t, lang, voice) : await google(t, lang, voice);
  remember(key, audio);
  return { audio, type: 'audio/mpeg' };
}

/** Node/Express-style handler shared by the dev server and the Vercel function. */
async function handler(req, res) {
  const send = (code, body, type = 'application/json') => {
    res.statusCode = code;
    res.setHeader('Content-Type', type);
    res.end(type === 'application/json' ? JSON.stringify(body) : body);
  };
  try {
    if (req.method === 'GET') return send(200, status());
    if (req.method !== 'POST') return send(405, { error: 'POST text to synthesise' });
    let body = req.body;
    if (!body || typeof body === 'string') {
      const raw = typeof body === 'string' ? body : await new Promise((ok) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 8000) req.destroy(); }); req.on('end', () => ok(d)); });
      body = raw ? JSON.parse(raw) : {};
    }
    const { audio, type } = await synth(body);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return send(200, audio, type);
  } catch (e) {
    console.warn('[tts]', e.message);
    return send(e.code || 502, { error: e.message });
  }
}

module.exports = { handler, status, synth, VOICES };
