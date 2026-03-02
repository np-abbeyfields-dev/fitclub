#!/bin/bash
# Set database-url secret to TCP format (for Cloud Run with in-container Cloud SQL Proxy)
# Run once, then deploy: ./deploy_to_dev.sh
#
# Password with + must be URL-encoded: + → %2B. No trailing % or newline.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/gcp.config.sh"

# TCP URL: app connects to 127.0.0.1:5432 where the proxy listens (password: + as %2B)
DATABASE_URL="postgresql://${DB_USER}:1301NJunne%2B%2B@127.0.0.1:5432/${DB_NAME}"

echo "Adding new version to secret database-url (TCP format, project=${GCP_PROJECT_ID})..."
printf '%s' "$DATABASE_URL" | gcloud secrets versions add database-url --data-file=- --project="${GCP_PROJECT_ID}"
echo "Done. Deploy: ./deploy_to_dev.sh"
echo ""
echo "Ensure Cloud Run service account has Cloud SQL Client:"
echo "  gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} --member=\"serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com\" --role=\"roles/cloudsql.client\""
