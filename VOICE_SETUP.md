# Studio voice setup (human-like Hindi, Gujarati & English)

Skiply's announcer speaks through a small server-side proxy (`/api/tts`) so your
speech key **never reaches the browser**. Pick one provider. Azure is recommended.

| Provider | Voices used (female / male) | Free allowance |
|---|---|---|
| **Microsoft Azure Speech** (recommended) | en-IN Neerja / Prabhat · hi-IN Swara / Madhur · gu-IN Dhwani / Niranjan | 0.5 million characters per month on the free (F0) tier |
| Google Cloud Text-to-Speech | en-IN Neural2-A / B · hi-IN Neural2-A / B · gu-IN Wavenet-A / B | 1 million WaveNet/Neural2 characters per month |

A typical announcement is ~150 characters, so the free tiers cover thousands of announcements a month.
Repeated phrases are cached on the server and in the browser.

## Option A: Microsoft Azure (recommended)

1. Sign in at https://portal.azure.com (a free account works).
2. **Create a resource → "Speech service"**.
   - Region: **Central India** (closest; any region works).
   - Pricing tier: **Free F0**.
3. Open the resource → **Keys and Endpoint**, copy **KEY 1** and the **Location/Region** (e.g. `centralindia`).
4. In the `skiply-web` folder, create a file named `.env.local`:

   ```
   AZURE_SPEECH_KEY=paste-key-1-here
   AZURE_SPEECH_REGION=centralindia
   ```

## Option B: Google Cloud

1. https://console.cloud.google.com → create/select a project.
2. **APIs & Services → Enable APIs → "Cloud Text-to-Speech API"** (billing must be enabled; usage within the free tier isn't charged).
3. **Credentials → Create credentials → API key**. Click **Restrict key** → API restrictions → *Cloud Text-to-Speech API*.
4. `.env.local`:

   ```
   GOOGLE_TTS_KEY=paste-key-here
   ```

## Turn it on

- **Local:** stop the dev server and start it again (`npm start`). The key is read once at start-up.
- In the site: **palette button → Voice announcer → on**. The panel should say
  **"Studio voice · Microsoft Azure neural"**. Press **▶ Play a sample announcement**.
- **Production (Vercel):** Project → Settings → Environment Variables → add the same
  variables, then redeploy. `api/tts.js` serves the voice there.
  Other hosts need a Node server that mounts `server/tts.js`'s `handler` at `/api/tts`.

## Safety notes

- Never name these variables `REACT_APP_…`. That would bake the key into the public JavaScript.
- `.env.local` is already git-ignored. Don't commit keys.
- If the key is missing or a request fails, Skiply quietly falls back to the device's built-in voices.
