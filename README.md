# MapleHelper

MapleHelper is a Global MapleStory progression planner that answers: **what should I upgrade next?**

The application now deploys as one Cloudflare Worker. The Worker serves the statically exported Next.js UI and the `/api` routes from the same origin.

## Stack

- Next.js 16, React 19, and TypeScript (static export)
- Cloudflare Workers with Hono
- Cloudflare D1 for users, sessions, characters, and equipment
- Cloudflare Workers AI for equipment and stat-equivalency screenshot extraction
- Discord OAuth2 for sign-in

The former Spring Boot implementation remains under `backend/` as a migration reference, but it is not used by the Cloudflare build or deployment.

## Local development

Requirements: Node.js 22.12 or newer and a Cloudflare account for Workers AI-backed OCR.

```powershell
npm install
npm --prefix frontend install
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run build
npm run dev
```

Open `http://localhost:8787`. Add your Discord application's local callback as:

```text
http://localhost:8787/login/oauth2/code/discord
```

Run verification with:

```powershell
npm run typecheck
npm --prefix frontend run lint
npm run build
```

## Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for D1 creation, secrets, migrations, Discord setup, and deployment.

## API compatibility

The Worker preserves the browser-facing Spring API paths:

- `/api/v1/auth/*`
- `/api/v1/characters/import`
- `/api/v1/profiles/*`
- `/api/v1/equipment/*`
- `/api/v1/character-stat-equivalencies/extract`

This keeps the existing frontend contract intact while replacing the Java/PostgreSQL runtime.
