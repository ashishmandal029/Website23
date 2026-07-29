# Netflix Link Generator (Vercel)

Web version of the WhatsApp `generatenf` plugin.

Paste Netflix cookies → validate `CURRENT_MEMBER` on `/account` → generate nftoken login link → show plan/email/details.

## Deploy on Vercel

1. Upload this folder to GitHub (or import the zip in Vercel).
2. **Vercel → Add New Project → Import**
3. Framework preset: **Next.js**
4. (Optional) Environment variable:
   - `API_SECRET` = any long secret
5. Deploy

Local:

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Features

| UI tab / API | What it does |
|---|---|
| **Generate Link** `POST /api/generate` | Check cookie + create login URL + account details |
| **Check Account** `POST /api/check` | Only scrape/validate account (no token) |
| **Bulk Generate** `POST /api/bulk` | Multiple cookies; only working ones return links (max 50) |

## Cookie formats accepted

- Netscape cookie file text
- JSON array of `{ name, value }`
- JSON object with `NetflixId` / `SecureNetflixId`
- Raw `NetflixId=...` lines

Bulk separator: a line with only `---` between accounts.

## API example

```bash
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: YOUR_API_SECRET' \
  -d '{"cookieText":"NetflixId=...\\nSecureNetflixId=..."}'
```

Response:

```json
{
  "ok": true,
  "loginUrl": "https://netflix.com/?nftoken=...",
  "expiryStr": "Unknown",
  "details": { "email": "...", "plan": "...", "status": "Active" },
  "detailsText": "📧 Email: ..."
}
```

## Notes

- Uses the same Netflix iOS token API + Android GraphQL fallback + `/account` scrape as the bot plugin.
- No cookie pool / WhatsApp buttons — this is a website + JSON API.
- Protect the deployment with `API_SECRET` if the site is public.
- Hobby Vercel plans may timeout long bulk runs; keep bulk under ~10–20 cookies or upgrade timeout.
