# Deploy MapleHelper to Cloudflare Workers

MapleHelper deploys as one Worker with static assets, API routes, D1, Workers AI, and Discord OAuth. No Vercel, Render, PostgreSQL, Java, Python, or Tesseract runtime is required.

## 1. Prerequisites

- Node.js 22.12 or newer
- A Cloudflare account with Workers, D1, and Workers AI access
- Wrangler authenticated with `npx wrangler login`
- A Discord application

Install dependencies:

```powershell
npm install
```

## 2. Create D1

```powershell
npx wrangler d1 create maplehelper
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing `replace-with-your-d1-database-id`, then apply the schema:

```powershell
npm run db:migrate:remote
```

The migrations create users, hashed sessions, profiles, equipment, the equipment catalog, and per-character boss plans. Existing PostgreSQL data needs a one-time export/import; do not point the Worker at the old PostgreSQL database.

### Preview D1

Worker previews use the separate `maplehelper-preview` database configured under `previews` in `wrangler.jsonc`. Apply preview schema and seed changes with:

```powershell
npm run db:migrate:preview
```

The shared preview database is isolated from production but is shared by all Worker preview versions. Do not store production data in it.

Boss presets require migration `0005_boss_presets.sql`. Apply migrations to the target database before deploying code that uses presets. Account income uses the existing per-character boss entries; it does not require a separate account-income table.

## 3. Configure Discord

In the Discord Developer Portal, add this redirect URI, replacing the hostname after the first deployment if you use a custom domain:

```text
https://maplehelper.<your-subdomain>.workers.dev/login/oauth2/code/discord
```

Store the credentials as Worker secrets:

```powershell
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
```

Set `APP_URL` in `wrangler.jsonc` to the exact public origin. For example:

```json
"APP_URL": "https://maplehelper.example.com"
```

The OAuth callback is always `${APP_URL}/login/oauth2/code/discord`.

For the stable `staging` preview, also register this exact Discord redirect URI:

```text
https://staging-maplehelper.achilliesftw.workers.dev/login/oauth2/code/discord
```

Cloudflare preview secrets are separate from production secrets. In **Workers & Pages → maplehelper → Settings → Variables and Secrets → Previews**, add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` to the Preview Base configuration.

## 4. Verify and deploy

```powershell
npm run typecheck
npm test
npm run lint
npm run build
npm run deploy
```

The deploy command builds `frontend/out` and publishes it with the Worker. Verify:

- `/health` returns `{"status":"UP"}`.
- Discord sign-in returns to the application.
- Character import and profile persistence work.
- Equipment and stat-equivalency screenshots return editable extraction results.
- Boss plans, party splits, and clear state persist per character.
- Sign-out invalidates the D1 session.

## Local secrets

Create `.dev.vars` from the checked-in example. Wrangler reads this file locally and `.gitignore` excludes it.

## Rollback

Use Cloudflare Workers version rollback for application code. D1 provides Time Travel for database recovery; database migrations remain forward-only, so review schema changes separately before deploying them.
