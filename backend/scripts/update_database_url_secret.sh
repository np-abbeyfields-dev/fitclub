#!/bin/bash
# Update database-url secret for Cloud Run (fix encoding and trailing chars)
# Run once, then redeploy: ./deploy_to_dev.sh
#
# Password 1301NJunne++ must be URL-encoded in the secret: + → %2B

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/gcp.config.sh"

# Correct URL: no trailing % or space; password with + encoded as %2B
DATABASE_URL="postgresql://${DB_USER}:1301NJunne%2B%2B@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

echo "Adding new version to secret database-url (project=${GCP_PROJECT_ID})..."
printf '%s' "$DATABASE_URL" | gcloud secrets versions add database-url --data-file=- --project="${GCP_PROJECT_ID}"
echo "Done. Redeploy the service so Cloud Run picks up the new secret: ./deploy_to_dev.sh"
