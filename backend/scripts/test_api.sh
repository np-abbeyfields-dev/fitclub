#!/bin/bash
# Quick API tests for FitClub (Cloud Run or local)
# Usage:
#   ./test_api.sh                          # use Cloud Run URL from gcloud
#   ./test_api.sh https://your-api.run.app # or pass base URL (no /api)
#   API_URL=http://localhost:8080 ./test_api.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/gcp.config.sh"

if [ -n "$1" ]; then
  BASE="$1"
else
  if [ -n "$API_URL" ]; then
    BASE="${API_URL}"
  else
    BASE=$(gcloud run services describe "${SERVICE_NAME}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)' 2>/dev/null || true)
    if [ -z "$BASE" ]; then
      echo "Usage: $0 <base_url>   e.g. $0 https://fitclub-api-xxx.run.app"
      echo "   or: API_URL=http://localhost:8080 $0"
      exit 1
    fi
  fi
fi

BASE="${BASE%/}"
API="${BASE}/api"

echo "Testing FitClub API at: ${API}"
echo ""

echo "1. Health (GET /api/health)"
echo "   curl -s \"${API}/health\" | jq"
curl -s "${API}/health" | jq .
echo ""

echo "2. Register (POST /api/auth/register) – expect 201 if DB OK, 500 if DB down"
echo "   curl -s -X POST \"${API}/auth/register\" -H \"Content-Type: application/json\" -d '{...}' | jq"
curl -s -X POST "${API}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'$(date +%s)'@example.com","password":"TestPass123!","displayName":"Test User"}' | jq .
echo ""

echo "Done. If health shows \"database\": false, register will return 500 until DB is fixed."
