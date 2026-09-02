# Shorten

Professional URL shortener with Bitly-inspired design, real Supabase storage, click tracking, QR codes, cookie preferences, and full legal pages.

## Features

- Create permanent short links stored in Supabase (PostgreSQL)
- Click counting via database function
- Client-side QR code generation
- Local history panel
- Cookie consent banner + preference center
- Privacy Policy, Terms of Service, Security, Cookie Policy
- Works in local/demo mode even without Supabase keys (links are not permanent until configured)

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open the SQL Editor and run the contents of `schema.sql`
3. Go to Project Settings → API and copy:
   - Project URL
   - `anon` `public` key
4. Paste them into `config.js`:

```js
window.SUPABASE_URL = "https://xxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";
```

5. Optionally set `window.SHORT_BASE` to your deployed origin so generated short links point to the correct host.

### 2. Run locally

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

### 3. Deploy

Push to GitHub and enable GitHub Pages (Settings → Pages → Deploy from branch `main` / root), or deploy the folder to any static host.

Short links resolve through `r.html?c=CODE`.

## File overview

| File | Purpose |
|------|---------|
| `index.html` | Main shortener UI |
| `r.html` | Redirect + click increment |
| `app.js` | Client logic |
| `config.js` | Supabase keys + base URL |
| `schema.sql` | Database schema + RLS |
| `privacy.html` / `terms.html` / `security.html` / `cookies.html` | Legal pages |

## Notes

- Free public shorteners can be abused. Monitor your Supabase usage and disable public insert if needed.
- For production-grade custom domains and cleaner short paths, put a reverse proxy or edge function in front of `r.html`.
