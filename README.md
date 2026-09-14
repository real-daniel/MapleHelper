# MapleHelper

MapleHelper is a Global MapleStory progression planner. Its goal is to answer a practical question: **what should I upgrade next?**

The current vertical slice imports a public character identity from NEXON's weekly rankings JSON API, displays it in a barebones test UI, saves profiles in PostgreSQL, and supports an MVP equipment screenshot review/confirm flow.

## Stack

- Next.js 15, React 19, and TypeScript
- Java 21 and Spring Boot 3
- Spring WebFlux for the NEXON rankings adapter
- PostgreSQL 16 with Flyway migrations and reactive R2DBC access

## Project structure

```text
MapleHelper/
+-- backend/    Spring Boot API
`-- frontend/   Next.js web app
```

The backend's `CharacterDataProvider` interface keeps the application independent from NEXON's rankings transport. The current adapter calls the JSON endpoint used by the official JavaScript rankings page.

## Run locally

### Backend

Requirements: JDK 21, Maven 3.9+, and Docker.

```powershell
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

The API starts at `http://localhost:8080`. Health is available at `/actuator/health`.

Character/profile examples:

```text
GET /api/v1/characters/import?name=FangBlade&region=NORTH_AMERICA
POST /api/v1/profiles/import
Content-Type: application/json

{"name":"FangBlade","region":"NORTH_AMERICA"}
```

Saved profiles are available through `GET /api/v1/profiles`, `GET /api/v1/profiles/{id}`, `PUT /api/v1/profiles/{id}`, and `DELETE /api/v1/profiles/{id}`.

Equipment MVP endpoints:

```text
POST /api/v1/equipment/extract
Content-Type: multipart/form-data

POST /api/v1/equipment
Content-Type: application/json

GET /api/v1/equipment
GET /api/v1/equipment?characterProfileId=1
DELETE /api/v1/equipment/{id}
```

Equipment OCR uses a local Tesseract executable. Install Tesseract and make `tesseract` available on PATH, or set:

```text
TESSERACT_COMMAND=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Star Force counting and screenshot preprocessing use local Python helpers under `backend/scripts`. Install their pinned dependencies with `pip install -r backend/requirements.txt`. The commands can be configured with:

```text
PYTHON_COMMAND=python
STAR_COUNTER_SCRIPT=scripts/count_starforce.py
```

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy

The prepared production architecture uses Vercel for the Next.js frontend and a Render Blueprint for the containerized Spring Boot API and PostgreSQL database. See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete account, environment-variable, DNS, verification, and rollback procedure.

## Current limitation

The frontend is intentionally barebones right now. It exists only to test character import, profile save/list, equipment screenshot paste, OCR text extraction, Star Force visual counting, equipment review/confirm, and delete flows while the backend shape settles.

## Roadmap

1. Wire OCR/vision extraction into the equipment screenshot draft step.
2. Harden the live NEXON rankings adapter.
3. Add equipment and resource entry using MapleStory.io metadata.
4. Compare upgrade paths with versioned GMS cost models.
5. Rank recommendations by expected gain per meso.
