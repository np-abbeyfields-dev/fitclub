# FitClub: Cloud SQL connection reference

**GCP project:** `fitclub-488901`  
**Region:** `us-west1` (default in scripts)

## Connection name

```
fitclub-488901:us-west1:fitclub
```

(Format: `PROJECT:REGION:INSTANCE` — if your instance has a different name, set `DB_INSTANCE` in `backend/scripts/gcp.config.sh`.)

## Create minimal Cloud SQL (one-time)

If you haven’t created the instance yet:

### 1. Enable APIs

```bash
gcloud services enable sqladmin.googleapis.com run.googleapis.com --project=fitclub-488901
```

### 2. Create instance (minimal / dev)

```bash
gcloud sql instances create fitclub \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-west1 \
  --project=fitclub-488901
```

Use `db-g1-small` if `db-f1-micro` is not available in your region.

### 3. Set root password (required by Cloud SQL)

```bash
gcloud sql users set-password postgres \
  --instance=fitclub \
  --password=YOUR_SECURE_ROOT_PASSWORD \
  --project=fitclub-488901
```

### 4. Create database and app user

Connect (e.g. via Cloud Shell or proxy + psql) and run:

```sql
CREATE DATABASE fitclub;
CREATE USER fitclub_user WITH PASSWORD 'your_app_password';
GRANT ALL PRIVILEGES ON DATABASE fitclub TO fitclub_user;
\c fitclub
GRANT ALL ON SCHEMA public TO fitclub_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fitclub_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fitclub_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fitclub_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fitclub_user;
```

Or create the user via gcloud (password only; DB/grants may need a one-time SQL step):

```bash
gcloud sql users create fitclub_user \
  --instance=fitclub \
  --password=YOUR_APP_PASSWORD \
  --project=fitclub-488901
```

Then create the database:

```bash
gcloud sql databases create fitclub --instance=fitclub --project=fitclub-488901
```

Grant permissions to `fitclub_user` on `fitclub` (e.g. via Cloud SQL Studio or `psql` as above).

## DATABASE_URL formats

**Local dev (Cloud SQL Proxy, default port 5433):**

```
postgresql://fitclub_user:PASSWORD@127.0.0.1:5433/fitclub?schema=public
```

**Cloud Run (Unix socket):**

```
postgresql://fitclub_user:PASSWORD@/fitclub?host=/cloudsql/fitclub-488901:us-west1:fitclub
```

## Verify

```bash
# Instance
gcloud sql instances describe fitclub --project=fitclub-488901

# DBs
gcloud sql databases list --instance=fitclub --project=fitclub-488901

# Users
gcloud sql users list --instance=fitclub --project=fitclub-488901
```
