# FitClub

Community-driven, team-based fitness competition platform. Backend deploys to **Cloud Run** with **Cloud SQL**; frontend is **Expo / React Native** (same stack as TeenLifeManager reference).

## GCP project

**Project ID:** `fitclub-488901` — see [docs/project/GCP_REFERENCE.md](docs/project/GCP_REFERENCE.md).

## Repo structure

- **backend/** — Node.js (Express + TypeScript + Prisma). Deploy to Cloud Run; DB on Cloud SQL.
- **frontend/** — Expo / React Native app. Same tech as TeenLifeManager.
- **docs/** — PRD, scoring spec, architecture, setup, GCP reference. TeenLifeManager is **read-only reference** (do not modify files in that folder).

## Quick start

**Backend**
```bash
cd backend && npm install && cp .env.example .env
# Set DATABASE_URL and JWT_SECRET in .env
npx prisma migrate dev --name init && npm run dev
```

**Frontend**
```bash
cd frontend && npm install
# Set EXPO_PUBLIC_API_URL to backend URL (e.g. http://YOUR_IP:8080/api)
npx expo start
```

See [docs/setup/BACKEND_SETUP.md](docs/setup/BACKEND_SETUP.md) and [docs/setup/FRONTEND_SETUP.md](docs/setup/FRONTEND_SETUP.md).

## Product & design

- [Product requirements (PRD)](docs/project/FITCLUB_PRD.md)
- [Scoring engine spec](docs/project/FITCLUB_SCORING_ENGINE_SPEC.md)
- [Architecture](docs/project/systemPatterns.md)
