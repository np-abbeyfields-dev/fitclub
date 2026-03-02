# GCP Project Reference

## Project ID

**FitClub GCP Project ID:** `fitclub-488901`

Use this project for all FitClub infrastructure (Cloud Run, Cloud SQL, Secret Manager, etc.).

## Deployment targets

| Component   | Target        | Notes                                      |
|------------|---------------|--------------------------------------------|
| **Backend**  | **Cloud Run** | Node 20, port 8080, Dockerfile in `backend/` |
| **Database**| **Cloud SQL** | PostgreSQL; set `DATABASE_URL` in Cloud Run (Unix socket or Auth Proxy) |

## Backend (Cloud Run)

- Build: `docker build -t gcr.io/fitclub-488901/fitclub-api ./backend` (or use Cloud Build).
- Run listens on `PORT` (default 8080); health checks: `GET /health` and `GET /api/health`.
- Env vars for production: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, optional `GCP_PROJECT_ID=fitclub-488901`.

## Database (Cloud SQL)

- Create a PostgreSQL instance in project `fitclub-488901`.
- Use Cloud SQL Auth Proxy for local dev, or Unix socket in Cloud Run:  
  `postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE`

## Reference codebase

Backend and frontend structure follow **TeenLifeManager** (in this workspace). Do not modify any files inside the TeenLifeManager folder; use it for reference only.
