# Jordan Inspiration Tours — demo

A Next.js 14 full-stack demo for a Jordan tour company. The public site reads published trips from SQLite, the protected admin dashboard edits the same database, and the travel assistant reloads that live data for every chat reply.

## Requirements

- Node.js 20 or newer
- An Anthropic API key for Claude-powered chat (the rest of the demo runs without one)

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public tour catalogue is at `/`, the chat at `/chat`, the combined demo login at `/login`, and the protected staff dashboard at `/admin`.

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before signing into the admin tab. The customer tab on the same login page is a demo guest entry and does not create a customer account. You can set `ANTHROPIC_API_KEY` in `.env`, or save the key from **Admin > Agent settings > Claude API connection**. Without a key, the assistant uses a deliberately limited database-only fallback.

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string; local default is `file:./dev.db` |
| `ANTHROPIC_API_KEY` | Optional server-side fallback Claude key; never exposed to the browser |
| `CLAUDE_MODEL` | Claude model identifier |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Single demo administrator credentials |
| `SESSION_SECRET` | Unique random secret (at least 32 characters), used for sessions and encrypting an API key saved from the admin UI |
| `NEXT_PUBLIC_SITE_URL` | Public base URL |

Use a unique, random `SESSION_SECRET` of at least 32 characters before saving an AI key locally or deploying. Do not rotate `SESSION_SECRET` while a key is saved in the admin UI: it is used to encrypt that key, so rotating it makes the saved value unreadable and you will need to enter the API key again. Use non-demo admin credentials before deploying.

## Sample information

`npm run seed` inserts five marked sample tours, FAQ/policy answers, company details, agent settings and staff-managed knowledge notes. The seed can be run again safely for tours and singleton settings; it refreshes the sample FAQ list. Sample images use public Unsplash URLs.

## Admin and agent

- `/admin` is protected by a signed, HTTP-only cookie and middleware.
- Manage tours, day trips, FAQs/policies, company details, agent tone and lead collection.
- Add the Anthropic API key under **Agent settings**. Admin-saved keys are encrypted in the database and never returned to the browser; an `ANTHROPIC_API_KEY` environment variable remains available as a fallback.
- **Agent knowledge** stores additional staff-entered facts. Active notes, published tours, current prices, FAQs, company information and settings are loaded from the database on every chat turn.
- Draft tours are excluded from the public catalogue and agent context.
- Chat records include language, the last 20 messages of context, and lead details explicitly provided by the traveller.
- Admin tour fields are validated by the server. Tour image URLs can point to your own storage; local file storage is intentionally not configured for this demo.

## SQLite and PostgreSQL

Local development uses SQLite with `prisma/schema.prisma`. The Render deployment uses the equivalent PostgreSQL schema in `prisma/postgres/schema.prisma`; keep the model definitions in sync when changing the data model. Each provider has its own migration history and client-generation command. The application queries do not depend on provider-specific SQL.

## Deploy to Render

The repository includes a Render Blueprint at [`render.yaml`](./render.yaml). It provisions a Node web service and PostgreSQL database, applies PostgreSQL migrations on startup, and seeds the sample data only when the database has not been initialized yet. The SQLite schema and local workflow remain unchanged; the Render/PostgreSQL schema and its migration history live under `prisma/postgres/`.

1. Push this repository to GitHub and create a new Blueprint in Render using that repository.
2. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` when Render prompts for the unsynced values. Render generates `SESSION_SECRET` automatically.
3. Deploy the Blueprint, then sign in at `/login?mode=admin`. Add the Anthropic key from **Agent settings**; it is encrypted using the generated session secret.

The Blueprint currently uses Render's **Free** plans for a demo preview. Free web services can spin down when idle, and free PostgreSQL databases expire after 30 days (with a limited recovery period before deletion). Do not use these plans for production or long-term data. Before relying on the site, upgrade the web service and database to paid plans in Render. Keep the web service and database in the same region.

For manual PostgreSQL operations, use `npm run db:generate:postgres`, `npm run db:migrate:postgres`, and, once only for an empty database, `npm run seed:postgres`. Do not run the seed command after staff have edited the live tour data.

## Build

```powershell
npx prisma generate
npx tsc --noEmit
npm run build
```
