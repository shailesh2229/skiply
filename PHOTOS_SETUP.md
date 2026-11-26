# Real venue photos (Google Places)

Skiply shows the real photo of each hospital, clinic, bank, salon… in this order:

1. **Free open data first:** a photo linked on OpenStreetMap or Wikidata for that exact place.
2. **Google Places photo** of the same business (needs the key below).
3. **Wikimedia Commons** photos taken at that spot whose name matches.
4. Otherwise a clearly-labelled *representative* photo of that kind of place.

Google is only asked when free open data has nothing, through a small server route
(`/api/venue-photo`) so **your key never reaches the browser**.

## 1. Create the key (about 5 minutes)

1. Go to https://console.cloud.google.com and create or select a project.
2. **Billing:** link a billing account (required by Google; there is a monthly free usage tier).
3. **APIs & Services → Library → "Places API (New)" → Enable.**
4. **APIs & Services → Credentials → Create credentials → API key.**
5. Click the key → **API restrictions → Restrict key → Places API (New)** → Save.
   (Leave *Application restrictions* as **None**: the key is only used by your server.)
6. Optional but wise: **Billing → Budgets & alerts** → set a monthly budget with email alerts.

## 2. Add it to Skiply

In the `skiply-web` folder, add to `.env.local` (create the file if needed):

```
GOOGLE_PLACES_KEY=paste-your-key-here
GOOGLE_PHOTOS_DAILY_CAP=1500
```

Restart the dev server (`npm start`). Open any venue page: the photo credit should read
**"Photo: <name> · Google Maps"**. Venue cards with a real photo get a small green dot.

**Production (Vercel):** Project → Settings → Environment Variables → add the same two
variables → redeploy. `api/venue-photo.js` handles the requests there.

## What it costs

Each venue that has no free photo uses one Google *Text Search* request plus one *Place Photo*
request, and the result is reused for 6 hours on the server and for the visitor's session in the browser.
Google's prices and free tiers change; check https://developers.google.com/maps/billing-and-pricing/pricing
for the current numbers. `GOOGLE_PHOTOS_DAILY_CAP` (default 1500 lookups a day) and a
40-lookups-per-minute limit per visitor stop runaway bills.

## Rules Skiply follows

- Every Google photo shows its photographer's name with a link, plus "Google Maps".
- Google photo links aren't stored long-term (session only), as Google's terms require.
- Never prefix the key with `REACT_APP_` (that would publish it). `.env.local` is git-ignored.
