#!/bin/bash
# Verify Cloud SQL instance, database, and user for FitClub
# Usage: ./verify_database.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/gcp.config.sh"

echo "FitClub Cloud SQL verification (project: ${GCP_PROJECT_ID})"
echo ""

echo "1. Instance (should list ${DB_INSTANCE})"
gcloud sql instances list --project="${GCP_PROJECT_ID}" --format="table(name,region,state,connectionName)"
echo ""

echo "2. Databases on instance ${DB_INSTANCE} (should include ${DB_NAME})"
gcloud sql databases list --instance="${DB_INSTANCE}" --project="${GCP_PROJECT_ID}" --format="table(name)"
echo ""

echo "3. Users on instance ${DB_INSTANCE} (should include ${DB_USER})"
gcloud sql users list --instance="${DB_INSTANCE}" --project="${GCP_PROJECT_ID}" --format="table(name,type)"
echo ""

echo "4. Connection name (use in DATABASE_URL secret)"
echo "   ${CONNECTION_NAME}"
echo ""

echo "5. Correct DATABASE_URL format for Cloud Run (Unix socket)"
echo "   postgresql://${DB_USER}:YOUR_PASSWORD@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
echo "   - Replace YOUR_PASSWORD; if password contains + use %2B in the URL"
echo "   - No trailing % or newline in the secret"
echo ""

echo "6. Test connection locally (Cloud SQL Proxy uses port 5433 by default)"
echo "   Start proxy: ./start-cloud-sql-proxy.sh"
echo "   Then use port 5433 (not 5432, or you hit local Postgres):"
echo "   psql \"postgresql://${DB_USER}:PASSWORD@127.0.0.1:5433/${DB_NAME}\" -c 'SELECT 1'"
echo ""
