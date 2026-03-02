# FitClub Backend Setup

## Prerequisites

- Node.js >= 20
- PostgreSQL (local or Cloud SQL)
- (Optional) Docker for Cloud Run builds

## Local development

1. **Clone and install**
   ```bash
   cd backend
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your Postgres connection string (e.g. `postgresql://user:password@localhost:5432/fitclub`)
   - Set `JWT_SECRET` (use a strong value in production)

3. **Database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   API: http://localhost:8080  
   Health: http://localhost:8080/api/health

## Local dev with Cloud SQL (minimal instance)

To use your Cloud SQL instance in **fitclub-488901** for local dev:

1. **Set env:** `cd backend/scripts && chmod +x *.sh && ./setup-local-cloud-sql-env.sh` (enter DB password when prompted).
2. **Start proxy:** In another terminal, `cd backend/scripts && ./start-cloud-sql-proxy.sh`.
3. **Migrate:** `cd backend && npx prisma migrate deploy` (or `npx prisma migrate dev --name init` first time).
4. **Run:** `npm run dev`.

See [LOCAL_CLOUD_SQL_SETUP.md](../deployment/LOCAL_CLOUD_SQL_SETUP.md) and [CLOUD_SQL_FITCLUB.md](../deployment/CLOUD_SQL_FITCLUB.md).

## Cloud Run + Cloud SQL (deploy)

- GCP project: **fitclub-488901** (see [GCP_REFERENCE.md](../project/GCP_REFERENCE.md))
- Build and deploy the container to Cloud Run; set env vars (including `DATABASE_URL` for Cloud SQL).
- Use Cloud SQL Auth Proxy or Unix socket for `DATABASE_URL` in production.
