// Vercel serverless function: POST /api/tts { text, lang, gender } → audio/mpeg; GET /api/tts → status.
// Set AZURE_SPEECH_KEY + AZURE_SPEECH_REGION (or GOOGLE_TTS_KEY) in the Vercel project's environment variables.
const { handler } = require('../server/tts');

module.exports = handler;
