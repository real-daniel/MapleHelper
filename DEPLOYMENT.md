# Deploy MapleHelper with Vercel and Render

This guide deploys the Next.js frontend to Vercel and provisions the Spring Boot API and PostgreSQL database on Render. Discord is the only sign-in method. Browser API traffic goes through a same-origin `/backend` proxy on Vercel so the login session remains a first-party cookie.

Replace `example.com` throughout with the domain you own.

## Before you begin

You need:

- A GitHub repository containing this project
- A Vercel account connected to GitHub
- A Render account connected to GitHub
- A Discord account with access to the Developer Portal
- Access to your domain's DNS settings

Run the checks below and push the deployment files:

```powershell
cd C:\Users\peter\Desktop\Code\MapleHelper
cd backend
.\run-tests.ps1
cd ..\frontend
npm run lint
npm run build
cd ..
git add .
git commit -m "Prepare deployment"
git push origin master
```

## 1. Create the API and database on Render

1. Sign in to Render and open **Blueprints**.
2. Select **New Blueprint Instance** and connect the MapleHelper GitHub repository.
3. Render detects `render.yaml` in the repository root.
4. When prompted for `FRONTEND_ORIGINS`, enter the exact Vercel frontend origin (for the current deployment, `https://maple-helper-blush.vercel.app`).
5. The Discord values can be entered after the Discord application is created in the next section.
6. Apply the Blueprint.
7. Wait for both `maplehelper-db` and `maplehelper-api` to become available.

The Blueprint wires the database credentials into the API without storing secrets in Git. It uses Render's internal database network and runs Flyway migrations when the API starts.

Open the generated API health URL:

```text
https://maplehelper-api.onrender.com/actuator/health
```

It should return a response whose status is `UP`.

If the free instance is too small for OCR or its cold starts are disruptive, change the API plan in Render before changing application code.

## 2. Create the Discord OAuth application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and select **New Application**.
2. Give it a user-facing name such as `MapleHelper`. A bot is not required.
3. Open **OAuth2** and add this Redirect URI exactly:

```text
https://maple-helper-blush.vercel.app/backend/login/oauth2/code/discord
```

4. Copy the **Client ID**. Reset/copy the **Client Secret** and store it only in Render.
5. In the Render service's **Environment** page, add:

```text
DISCORD_CLIENT_ID=<the Discord application ID>
DISCORD_CLIENT_SECRET=<the Discord client secret>
DISCORD_REDIRECT_URI=https://maple-helper-blush.vercel.app/backend/login/oauth2/code/discord
FRONTEND_LOGIN_SUCCESS_URL=https://maple-helper-blush.vercel.app
FRONTEND_LOGIN_FAILURE_URL=https://maple-helper-blush.vercel.app/?login=error
FRONTEND_ORIGINS=https://maple-helper-blush.vercel.app
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
```

6. Save the Render environment and wait for its redeployment. The application requests only Discord's `identify` scope.

If the Render Blueprint already exists, new `sync: false` entries in `render.yaml` are not automatically populated. Add the six Discord/frontend URL values above manually.

## 3. Deploy the frontend on Vercel

1. Sign in to Vercel and select **Add New > Project**.
2. Import the MapleHelper GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Set **Framework Preset** to **Next.js**. The checked-in `frontend/vercel.json` also pins the framework and `.next` output directory so Vercel cannot mistake the app for a generic static site.
5. Under **Build and Deployment**, do not set the Output Directory to `public`.
6. Add these production environment variables:

```text
NEXT_PUBLIC_API_BASE_URL=/backend
BACKEND_API_URL=https://maplehelper-api.onrender.com
```

7. Select **Deploy**.
8. Copy the generated production URL, such as `https://maplehelper.vercel.app`.
9. In the Render API's **Environment** settings, make sure all frontend and Discord URLs use that exact Vercel URL, then wait for the API redeploy.
10. Open the Vercel URL, sign in with Discord, and test character import and an OCR upload.

`NEXT_PUBLIC_API_BASE_URL` is embedded in the browser build, so changes require a new Vercel deployment. `BACKEND_API_URL` is server-only and must not use the `NEXT_PUBLIC_` prefix.

## 4. Connect the production domain to Vercel

1. In the Vercel project, open **Settings > Domains**.
2. Add `example.com` and `www.example.com`.
3. At your current DNS provider, add the records Vercel displays.
4. Choose one hostname as canonical and redirect the other to it.
5. Wait for Vercel to verify DNS and issue the TLS certificate.

Do not copy DNS values from a generic guide. Use the exact records shown for your Vercel project.

## 5. Connect the API subdomain to Render (optional)

1. Open the `maplehelper-api` service in Render.
2. Open **Settings > Custom Domains**.
3. Add `api.example.com`.
4. At your DNS provider, create the CNAME record Render displays.
5. Wait for Render to verify DNS and issue the TLS certificate.
6. Verify `https://api.example.com/actuator/health` returns `UP`.

## 6. Switch authentication to the final domain

Keep the Vercel proxy configuration as:

```text
NEXT_PUBLIC_API_BASE_URL=/backend
BACKEND_API_URL=https://maplehelper-api.onrender.com
```

Add this second Redirect URI in Discord before switching traffic:

```text
https://example.com/backend/login/oauth2/code/discord
```

In Render, set:

```text
FRONTEND_ORIGINS=https://example.com,https://www.example.com
FRONTEND_LOGIN_SUCCESS_URL=https://example.com
FRONTEND_LOGIN_FAILURE_URL=https://example.com/?login=error
DISCORD_REDIRECT_URI=https://example.com/backend/login/oauth2/code/discord
```

Render will redeploy the API. Only include origins you control. The callback URI must match the Discord Developer Portal entry exactly, including scheme and path.

## 7. Final verification

Check all of the following:

- `https://example.com` loads over HTTPS.
- `https://api.example.com/actuator/health` reports `UP`.
- A signed-out visitor sees the Discord sign-in screen and cannot access saved data.
- Discord returns to the site after authorization and the signed-in name/avatar appears.
- Signing out returns to the sign-in screen.
- Character import works from the production frontend.
- A profile can be saved and loaded again.
- Equipment and stat-equivalency screenshot uploads complete.
- Browser developer tools show no CORS or mixed-content errors.
- A new push to `master` triggers both hosting providers to deploy.

## Production environment reference

The Render Blueprint supplies the database variables automatically:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USERNAME
DATABASE_PASSWORD
```

The remaining production variables are:

```text
# Render API
FRONTEND_ORIGINS=https://example.com,https://www.example.com
FRONTEND_LOGIN_SUCCESS_URL=https://example.com
FRONTEND_LOGIN_FAILURE_URL=https://example.com/?login=error
DISCORD_CLIENT_ID=<secret value from Discord>
DISCORD_CLIENT_SECRET=<secret value from Discord>
DISCORD_REDIRECT_URI=https://example.com/backend/login/oauth2/code/discord
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
PYTHON_COMMAND=python3
TESSERACT_COMMAND=tesseract

# Vercel frontend
NEXT_PUBLIC_API_BASE_URL=/backend
BACKEND_API_URL=https://maplehelper-api.onrender.com
```

Never commit database passwords or other secrets to the repository.

## Rollback

Both providers retain earlier deployments. If a release fails, use the provider dashboard to redeploy the last known-good version. Database schema migrations require separate review before rolling back application code because Flyway migrations are intentionally forward-only.
