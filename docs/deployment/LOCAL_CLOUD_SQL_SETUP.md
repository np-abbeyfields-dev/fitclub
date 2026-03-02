# FitClub: Local dev with Cloud Run + Cloud SQL

Use your **minimal Cloud SQL** instance in project **fitclub-488901** for local backend development.

## Prerequisites

- Cloud SQL instance created in `fitclub-488901` (see [CLOUD_SQL_FITCLUB.md](./CLOUD_SQL_FITCLUB.md) for creation steps)
- `gcloud` CLI installed and authenticated: `gcloud auth application-default login`
- Project set: `gcloud config set project fitclub-488901`

## Quick start

### 1. Set backend env (Cloud SQL via proxy)

From repo root:

```bash
cd backend/scripts
chmod +x gcp.config.sh setup-local-cloud-sql-env.sh start-cloud-sql-proxy.sh
./setup-local-cloud-sql-env.sh
```

Enter your Cloud SQL database password when prompted. This writes `backend/.env` with:

- `DATABASE_URL=postgresql://fitclub_user:PASSWORD@127.0.0.1:5433/fitclub?schema=public`
- `NODE_ENV=development`, `PORT=8080`, `JWT_SECRET`, `GCP_PROJECT_ID=fitclub-488901`

### 2. Start Cloud SQL Proxy

In a **separate terminal** (keep it open):

```bash
cd backend/scripts
./start-cloud-sql-proxy.sh
```

Proxy listens on **port 5433** and forwards to your Cloud SQL instance.

### 3. Run Prisma migrations

```bash
cd backend
npx prisma migrate deploy
# or first time: npx prisma migrate dev --name init
```

### 4. Start backend

```bash
cd backend
npm run dev
```

API: http://localhost:8080  
Health: http://localhost:8080/api/health

## Config (optional)

Edit `backend/scripts/gcp.config.sh` if your setup differs:

| Variable         | Default        | Description        |
|------------------|----------------|--------------------|
| `GCP_PROJECT_ID` | fitclub-488901 | GCP project        |
| `GCP_REGION`     | us-west1       | Region of instance |
| `DB_INSTANCE`    | fitclub        | Cloud SQL instance name |
| `DB_NAME`        | fitclub        | Database name      |
| `DB_USER`        | fitclub_user   | DB user            |
| `PROXY_PORT`     | 5433           | Local proxy port   |

## Stop proxy

```bash
pkill -f 'cloud-sql-proxy.*fitclub-488901'
```

## Troubleshooting

- **Proxy won’t start:** `lsof -i :5433` — free the port or use another `PROXY_PORT`.
- **Backend can’t connect:** Ensure the proxy is running and `DATABASE_URL` in `.env` uses port 5433.
- **Auth failed:** Reset DB password in Cloud Console (SQL → Users) and run `./setup-local-cloud-sql-env.sh` again.
