# YourNextSpot

A living atlas of where to eat, drink and sip in Singapore — built to erase decision fatigue.

- **AI concierge** — a shimmering, "alive" search bar. Tell it how you feel ("cozy rainy-day date", "impress a client", "cheap eats near Joo Chiat") and Claude reads the mood and recommends from your own curated list.
- **Decide-for-me roulette** — a one-tap randomiser (respects your filters) for pure serendipity.
- **The five-tier "star system"** — instead of flat 1–5 stars, every spot sits on an occasion ladder: `Everyday Delight → Thoughtful Treat → Memorable Occasion → Landmark Celebration → Crown Jewel`, paired with a 0–10 Worth-It Score and a one-line verdict.
- **Shareable cards** — generate a beautiful IG-story / LinkedIn card for any spot (the virality engine).
- **The Locker** — passwordless email-OTP login so anyone can add their own reviews.
- **Accurate map** — every spot is geocoded (OpenStreetMap) with a precise Google Maps deep link.

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React + Vite + TypeScript + Tailwind, Leaflet map           |
| Backend  | Express + TypeScript, JWT (httpOnly cookie) auth            |
| Data     | PostgreSQL via Prisma                                        |
| AI       | Anthropic Claude (`@anthropic-ai/sdk`) with a local fallback |
| Email    | Resend (with a dev console fallback)                        |
| Hosting  | Railway (one service + Postgres plugin)                     |

```
client/   React app (home, concierge, map, spot detail, share cards)
server/   Express API (spots, reviews, randomize, auth, concierge)
data/     spots.seed.json — the geocoded source of truth
scripts/  geocode.mjs — one-time coordinate enrichment
```

## Local development

Prerequisites: Node 20+, a local PostgreSQL.

```bash
# 1. install (also generates the Prisma client)
npm install

# 2. configure env (a local .env is already provided; adjust DATABASE_URL if needed)
#    DATABASE_URL="postgresql://USER@localhost:5432/yournextspot?schema=public"

# 3. create schema + seed spots and demo reviews
npm run db:migrate
npm run db:seed

# 4. run both client (5173) and server (8080)
npm run dev
```

Open http://localhost:5173.

### Optional: turn the features fully "live"

Everything works out of the box with sensible fallbacks. To go live:

- **Claude concierge** — set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`). Without it, a local keyword/mood matcher is used so search always returns picks.
- **Email OTP** — set `RESEND_API_KEY` and a verified `OTP_FROM_EMAIL`. Without it, the one-time code prints to the server console and is surfaced in the login modal (dev mode).

## Refreshing coordinates

`data/spots.seed.json` already contains baked-in `lat`/`lng`. To re-geocode (e.g. after adding spots), run:

```bash
node scripts/geocode.mjs   # resumable; only fills spots missing coordinates
npm run db:seed            # reload into the database
```

## Deploy to Railway

1. Create a Railway project and add the **PostgreSQL** plugin (it sets `DATABASE_URL` automatically).
2. Add the service from this repo. `railway.json` configures the build (`npm run build`) and start (`npm start`).
3. Set environment variables on the service:
   - `JWT_SECRET` (long random string)
   - `NODE_ENV=production`
   - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (optional, for live Claude)
   - `RESEND_API_KEY`, `OTP_FROM_EMAIL` (optional, for live email)
4. On boot, `npm start` runs `prisma migrate deploy` then starts the server (which also serves the built client).
5. Seed once from the Railway shell:
   ```bash
   npm run db:seed
   ```

## Environment variables

See [.env.example](.env.example) for the full list and defaults.

## Roadmap ideas

Passport / year-in-review "Wrapped", "near me" distance sorting, friends' reviews via the Locker, a weekly "Spot of the Week" email, and turning the name-only entries into a shared bucket list.
