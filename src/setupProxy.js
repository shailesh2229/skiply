// Dev server only (Create React App loads this automatically).
// Serves /api/tts locally so the voice key in .env.local never reaches the browser.
const path = require('path');
const fs = require('fs');

// CRA only exposes REACT_APP_* vars to the bundle; load the server-side keys ourselves.
['.env', '.env.local', '.env.development.local'].forEach((f) => {
  const p = path.join(__dirname, '..', f);
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
});

const { handler } = require('../server/tts');
const venuePhoto = require('../server/venue-photo');

module.exports = function setup(app) {
  app.use('/api/tts', (req, res) => { handler(req, res); });
  app.use('/api/venue-photo', (req, res) => { req.url = req.originalUrl; venuePhoto.handler(req, res); });
};
