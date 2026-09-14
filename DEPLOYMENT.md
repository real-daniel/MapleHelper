# Deploy MapleHelper with Vercel and Render

This guide deploys the Next.js frontend to Vercel and provisions the Spring Boot API and PostgreSQL database on Render.

Replace `example.com` throughout with the domain you own.

## Before you begin

You need:

- A GitHub repository containing this project
- A Vercel account connected to GitHub
- A Render account connected to GitHub
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
4. When prompted for `FRONTEND_ORIGINS`, initially enter `http://localhost:3000`. This temporary value keeps CORS closed while the Vercel URL is not yet known.
5. Apply the Blueprint.
6. Wait for both `maplehelper-db` and `maplehelper-api` to become available.

The Blueprint wires the database credentials into the API without storing secrets in Git. It uses Render's internal database network and runs Flyway migrations when the API starts.

Open the generated API health URL:

```text
https://maplehelper-api.onrender.com/actuator/health
```

It should return a response whose status is `UP`.

If the free instance is too small for OCR or its cold starts are disruptive, change the API plan in Render before changing application code.

## 2. Deploy the frontend on Vercel

1. Sign in to Vercel and select **Add New > Project**.
2. Import the MapleHelper GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Set **Framework Preset** to **Next.js**. The checked-in `frontend/vercel.json` also pins the framework and `.next` output directory so Vercel cannot mistake the app for a generic static site.
5. Under **Build and Deployment**, do not set the Output Directory to `public`.
6. Add this production environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://maplehelper-api.onrender.com
```

7. Select **Deploy**.
8. Copy the generated production URL, such as `https://maplehelper.vercel.app`.
9. In the Render API's **Environment** settings, change `FRONTEND_ORIGINS` to that exact Vercel URL and wait for the API redeploy.
10. Open the Vercel URL and test character import and an OCR upload.

`NEXT_PUBLIC_API_BASE_URL` is embedded in the browser build, so every change to it requires a new Vercel deployment.

## 3. Connect the production domain to Vercel

1. In the Vercel project, open **Settings > Domains**.
2. Add `example.com` and `www.example.com`.
3. At your current DNS provider, add the records Vercel displays.
4. Choose one hostname as canonical and redirect the other to it.
5. Wait for Vercel to verify DNS and issue the TLS certificate.

Do not copy DNS values from a generic guide. Use the exact records shown for your Vercel project.

## 4. Connect the API subdomain to Render

1. Open the `maplehelper-api` service in Render.
2. Open **Settings > Custom Domains**.
3. Add `api.example.com`.
4. At your DNS provider, create the CNAME record Render displays.
5. Wait for Render to verify DNS and issue the TLS certificate.
6. Verify `https://api.example.com/actuator/health` returns `UP`.

## 5. Switch the applications to the final domains

In Vercel, change the production environment variable to:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

Redeploy the frontend from **Deployments**.

In Render, set:

```text
FRONTEND_ORIGINS=https://example.com,https://www.example.com
```

Render will redeploy the API. Only include origins you control. If you want a specific Vercel preview deployment to use the production API, append that exact preview origin to this comma-separated value.

## 6. Final verification

Check all of the following:

- `https://example.com` loads over HTTPS.
- `https://api.example.com/actuator/health` reports `UP`.
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
PYTHON_COMMAND=python3
TESSERACT_COMMAND=tesseract

# Vercel frontend
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

Never commit database passwords or other secrets to the repository.

## Rollback

Both providers retain earlier deployments. If a release fails, use the provider dashboard to redeploy the last known-good version. Database schema migrations require separate review before rolling back application code because Flyway migrations are intentionally forward-only.
