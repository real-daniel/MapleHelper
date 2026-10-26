# MapleHelper

MapleHelper is a Global MapleStory progression planner that answers: **what should I upgrade next?**

The application now deploys as one Cloudflare Worker. The Worker serves the statically exported Next.js UI and the `/api` routes from the same origin.

## Stack

- Next.js 16, React 19, and TypeScript (static export)
- Cloudflare Workers with Hono
- Cloudflare D1 for users, sessions, characters, equipment, and per-character boss plans
- Cloudflare Workers AI for screenshot transcription, followed by deterministic TypeScript parsing and calculations
- Discord OAuth2 for sign-in

The former Spring Boot implementation remains under `backend/` as a migration reference, but it is not used by the Cloudflare build or deployment.

## Local development

Requirements: Node.js 22.12 or newer and a Cloudflare account for Workers AI-backed OCR.

```powershell
npm install
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
npm test
npm run lint
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
- `/api/v1/boss-tracker/*`
- `/api/v1/character-stat-equivalencies/extract`

This keeps the existing frontend contract intact while replacing the Java/PostgreSQL runtime.

The legacy equipment behavior is also ported: fuzzy catalog matching, OCR cleanup, skill-ring/pocket/Sweetwater rules, cumulative Star Force tables, flame derivation and tier solving, multi-slot replacement, and stat-equivalency normalization. Workers AI replaces the Tesseract image-to-text runtime; deterministic application rules run after transcription.

The Boss Income calculator saves a separate plan for each imported character, including difficulty, editable crystal value, party split, and clear state. It reports weekly earnings and a monthly projection while keeping preview and production data isolated through their D1 bindings.

Open **Characters → select a character → Boss tracker** to manage a plan. Named presets save the selected bosses and their settings to your account for reuse on any character; applying a preset replaces selections and retains clears only for bosses still selected. Presets never copy clears from the source character.

Weekly income uses each character's highest 14 personal crystal payouts after party splits. The account summary then counts the highest 180 eligible weekly payouts across all characters. Planned and cleared income are calculated separately; monthly bosses are reported separately and do not consume weekly crystal slots. Extra selected bosses remain in the tracker. Monthly projections use 4.345 weeks plus planned monthly boss income.
