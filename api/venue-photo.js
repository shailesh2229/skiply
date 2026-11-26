// Vercel serverless function: GET /api/venue-photo?name=&lat=&lng= → Google Places photo for that venue.
// Set GOOGLE_PLACES_KEY (and optionally GOOGLE_PHOTOS_DAILY_CAP) in the Vercel project's environment variables.
const { handler } = require('../server/venue-photo');

module.exports = handler;
