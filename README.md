# YourNextSpot

YourNextSpot is a Singapore food, coffee, and bar decision app. The production direction is a Netlify-hosted React frontend calling a Railway Express API backed by Railway Postgres and Resend OTP email.

## What It Does

- **Quick pick**: a focused randomiser that respects current Singapore time and active filters.
- **Concierge**: chat-like recommendations for specific briefs. Vague greetings ask for clarification instead of returning random picks.
- **Atlas**: searchable, progressively loaded cards plus a clustered tap-friendly map and Google Maps links.
- **Locker**: passwordless email OTP login, personal lockers, saved spots, and private visit entries.
- **Real community contributions**: one editable public review per member/place, plus public or private member photo uploads. Private photo files are access-controlled, not only hidden in the UI.
- **Time-aware UI**: live Singapore time, meal/drinks context, good-now/better-later/hours-unverified chips. Exact opening hours are intentionally marked unverified because this dataset does not include verified opening-hours fields.

Ratings and verdicts always come from real member reviews. The seed and static catalogue do not manufacture social proof.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + Vite + TypeScript + Tailwind, Leaflet map |
| Backend | Express + TypeScript, JWT httpOnly cookie auth |
| Data | PostgreSQL via Prisma |
| Concierge | Anthropic API when configured, local fallback when not |
| Email | Resend OTP, with dev-console fallback |
| Hosting | Netlify frontend + Railway API + Railway Postgres |

```
client/   React app
server/   Express API, Prisma schema, migrations, seed
data/     spots.seed.json
scripts/  geocode helper
```

## Local Development

Prerequisites: Node 20+ and PostgreSQL.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:5173`.

If Postgres is not on the default local URL, update `DATABASE_URL` before running migrations.

## Environment

Backend/Railway:

- `DATABASE_URL`: Railway Postgres provides this automatically.
- `JWT_SECRET`: long random string.
- `NODE_ENV=production`
- `CLIENT_ORIGIN`: comma-separated allowed frontend origins, for example `https://your-site.netlify.app`.
- `RESEND_API_KEY` and `OTP_FROM_EMAIL`: required for live OTP email. If unset, dev mode surfaces the code locally.
- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`: optional concierge provider. Without them, local matching still works.
- `UPLOAD_DIR`: durable photo directory. In Railway, mount a Volume and point this at its mount path.
- `PUBLIC_MEDIA_BASE`: public API origin used to construct uploaded-photo URLs.

Frontend/Netlify:

- `VITE_API_BASE`: Railway API base path, for example `https://your-api.up.railway.app/api`.

See [.env.example](.env.example) for local defaults.

## Deploy

### Railway API

1. Create a Railway project with the Postgres plugin.
2. Add this repo as the backend service. `railway.json` builds with `npm run build` and starts with `npm start`.
3. Set backend environment variables listed above.
4. `npm start` runs `prisma migrate deploy` before launching the API.
5. Seed once from the Railway shell after the first deploy:

```bash
npm run db:seed
```

### Netlify Frontend

1. Connect the same repo to Netlify.
2. Build command: `npm run build -w client`
3. Publish directory: `client/dist`
4. Set `VITE_API_BASE` to the Railway API `/api` URL.
5. Keep `netlify.toml`; it provides the static route fallback for React Router.

## Data Notes

The catalogue has categories, cuisine, area, price, coordinates, guide tiers, and notes. Scores and verdicts are calculated only from member reviews. It does not currently have verified opening hours, websites, reservation URLs, source provenance, or live availability. UI copy should keep saying “hours not verified” until those fields exist in the dataset.

Uploaded images are application data. Back up the database and the mounted upload Volume together; object storage is the recommended upgrade before a public launch.
