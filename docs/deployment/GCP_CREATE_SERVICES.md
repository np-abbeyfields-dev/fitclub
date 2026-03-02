# FitClub: Create GCP services (minimal / low cost)

**Project:** `fitclub-488901`  
**Region:** `us-west1`  

Use these in order. Replace placeholders like `YOUR_SECURE_PASSWORD` and `YOUR_JWT_SECRET` with real values.

---

## 0. Set project and auth

```bash
gcloud config set project fitclub-488901
gcloud auth application-default login
```

---

## 1. Enable APIs (only what we need)

No Artifact Registry needed — we use **Container Registry (gcr.io)** like TeenLifeManager’s simple path.

```bash
gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  --project=fitclub-488901
```

---

## 2. Cloud SQL (smallest tier)

**Cost note:** `db-f1-micro` is the cheapest (shared CPU, ~$7–10/mo). If unavailable in your region, use `db-g1-small`.

```bash
# Create instance (single zone = cheaper)
gcloud sql instances create fitclub \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-west1 \
  --storage-type=HDD \
  --storage-size=10GB \
  --storage-auto-increase \
  --project=fitclub-488901
```

If you get “db-f1-micro not available”, use:

```bash
gcloud sql instances create fitclub \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=us-west1 \
  --storage-type=HDD \
  --storage-size=10GB \
  --project=fitclub-488901
```

Set root password (required):

```bash
gcloud sql users set-password postgres \
  --instance=fitclub \
  --password=YOUR_SECURE_ROOT_PASSWORD \
  --project=fitclub-488901
```

Create app database and user:

```bash
gcloud sql databases create fitclub --instance=fitclub --project=fitclub-488901

gcloud sql users create fitclub_user \
  --instance=fitclub \
  --password=YOUR_APP_DB_PASSWORD \
  --project=fitclub-488901
```

Grant app user access to the database (run once, e.g. from Cloud Shell or after starting Cloud SQL Proxy):

```bash
# Optional: use proxy + psql to run SQL, or use Cloud Console SQL. One-time:
# \c fitclub
# GRANT ALL ON SCHEMA public TO fitclub_user;
# ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fitclub_user;
# ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fitclub_user;
```

---

## 3. Secret Manager (for DB URL and JWT)

Create secrets and set values (replace placeholders):

```bash
# DATABASE_URL for Cloud Run (Unix socket format)
# Replace YOUR_APP_DB_PASSWORD with the same password used for fitclub_user
echo -n "postgresql://fitclub_user:YOUR_APP_DB_PASSWORD@/fitclub?host=/cloudsql/fitclub-488901:us-west1:fitclub" | \
  gcloud secrets create database-url --data-file=- --project=fitclub-488901 2>/dev/null || \
  echo -n "postgresql://fitclub_user:YOUR_APP_DB_PASSWORD@/fitclub?host=/cloudsql/fitclub-488901:us-west1:fitclub" | \
  gcloud secrets versions add database-url --data-file=- --project=fitclub-488901

# JWT secret for API
echo -n "YOUR_JWT_SECRET_AT_LEAST_32_CHARS" | \
  gcloud secrets create jwt-secret --data-file=- --project=fitclub-488901 2>/dev/null || \
  echo -n "YOUR_JWT_SECRET_AT_LEAST_32_CHARS" | \
  gcloud secrets versions add jwt-secret --data-file=- --project=fitclub-488901
```

---

## 4. Cloud Run (minimal = scale to zero)

**No Artifact Registry:** Image goes to **gcr.io** (Container Registry), same as TeenLifeManager’s simple deploy.

**Cost note:** Min instances = 0 so you pay only when the API is used. 256Mi / 1 vCPU is enough for a light API.

Build and push the image (Cloud Build runs the Dockerfile in the cloud; no local Docker required):

```bash
cd backend
gcloud builds submit --tag gcr.io/fitclub-488901/fitclub-api --project=fitclub-488901
```

Deploy the service (connects to Cloud SQL, mounts secrets):

```bash
gcloud run deploy fitclub-api \
  --image=gcr.io/fitclub-488901/fitclub-api \
  --region=us-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=fitclub-488901:us-west1:fitclub \
  --set-secrets=DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=fitclub-488901" \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --project=fitclub-488901
```

Get the service URL:

```bash
gcloud run services describe fitclub-api --region=us-west1 --project=fitclub-488901 --format='value(status.url)'
```

Test:

```bash
curl "$(gcloud run services describe fitclub-api --region=us-west1 --project=fitclub-488901 --format='value(status.url)')/api/health"
```

---

## 5. Run Prisma migrations against Cloud SQL

From your machine, use the proxy so migrations hit the same DB Cloud Run uses:

```bash
# Terminal 1: start proxy
cd backend/scripts && ./start-cloud-sql-proxy.sh

# Terminal 2: .env must have DATABASE_URL pointing at 127.0.0.1:5433
cd backend
npx prisma migrate deploy
```

Or set `DATABASE_URL` temporarily to the Cloud Run–style URL and run migrations via Cloud Run (not typical); the usual way is proxy + local `prisma migrate deploy`.

---

## Cost summary (approximate, minimal config)

| Service        | Config              | Rough monthly cost   |
|----------------|---------------------|----------------------|
| Cloud SQL      | db-f1-micro, 10GB   | ~\$7–10              |
| Cloud Run      | 0 min, 256Mi, 1 vCPU| \$0 if no traffic    |
| Container Registry (gcr.io) | images for Cloud Run | \< \$1    |
| Secret Manager | few secrets         | \< \$1                |
| **Total**      |                     | **~\$10–15** (with light use) |

Scale to zero on Cloud Run and small DB tier keeps cost low.

---

## One-shot script (optional)

You can paste the non-interactive parts into a script. Passwords and JWT must be set separately (env vars or prompt); don’t commit them. No Artifact Registry step — we use gcr.io like TeenLifeManager’s simple path.

Use the step-by-step commands above for passwords and first-time setup.
