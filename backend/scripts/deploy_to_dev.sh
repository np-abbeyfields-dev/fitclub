#!/bin/bash
# Deploy FitClub API to Cloud Run (dev)
# Usage: from repo root or backend/scripts: ./deploy_to_dev.sh
#
# One-time: create Artifact Registry repo (if not exists):
#   gcloud artifacts repositories create fitclub-api --repository-format=docker --location=us-west1 --project=fitclub-488901

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/gcp.config.sh"

echo "Deploying FitClub API to Cloud Run (dev)..."
echo "  Project: ${GCP_PROJECT_ID}"
echo "  Region:  ${GCP_REGION}"
echo "  Service: ${SERVICE_NAME}"
echo "  Image:   ${IMAGE_NAME}"
echo ""

# From scripts/ go to backend/
cd "${SCRIPT_DIR}/.."

# Step 0: Create Artifact Registry repo if it doesn't exist (avoids "Repository not found" on push)
echo "Step 0: Ensuring Artifact Registry repo exists..."
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" &>/dev/null; then
  echo "  Creating repository ${AR_REPO}..."
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="FitClub API" \
    --project="${GCP_PROJECT_ID}"
  echo "  Done."
else
  echo "  Repository ${AR_REPO} exists."
fi
echo ""

# Ensure Docker auth for Artifact Registry (needed for Cloud Build to push)
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet 2>/dev/null || true

echo "Step 1: Building and pushing image..."
gcloud builds submit \
  --tag "${IMAGE_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  .

if [ $? -ne 0 ]; then
  echo "Build failed."
  exit 1
fi

echo ""
echo "Step 2: Deploying to Cloud Run..."
# DATABASE_URL secret must be TCP format: postgresql://fitclub_user:PASS@127.0.0.1:5432/fitclub (password: + as %2B)
# Container runs Cloud SQL Auth Proxy then Node; proxy listens on 127.0.0.1:5432.
# Do not set PORT - Cloud Run sets it automatically (reserved)
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_NAME}" \
  --region="${GCP_REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --set-secrets=DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars="NODE_ENV=development,GCP_PROJECT_ID=${GCP_PROJECT_ID},CLOUD_SQL_CONNECTION_NAME=${CONNECTION_NAME}" \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --project="${GCP_PROJECT_ID}"

echo ""
echo "Done. Service URL:"
gcloud run services describe "${SERVICE_NAME}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)'
echo ""
echo "Test: curl \$(gcloud run services describe ${SERVICE_NAME} --region=${GCP_REGION} --project=${GCP_PROJECT_ID} --format='value(status.url)')/api/health"
