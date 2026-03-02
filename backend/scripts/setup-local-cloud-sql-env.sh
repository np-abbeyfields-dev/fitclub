#!/bin/bash

# Set up local backend .env to use Cloud SQL via proxy (FitClub)
# Run from backend/ or backend/scripts/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/gcp.config.sh"

PROXY_PORT="${PROXY_PORT:-5433}"

echo "🔧 FitClub: setting up .env for Cloud SQL (dev)..."
echo "   Project: ${GCP_PROJECT_ID}"
echo "   Instance: ${DB_INSTANCE}"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   Proxy port: ${PROXY_PORT}"
echo ""

cd "$(dirname "$0")/.."

# Optional: try to get password from GCP Secret Manager
try_get_password() {
  if [ -n "${DB_PASSWORD:-}" ]; then return 0; fi
  if ! command -v gcloud >/dev/null 2>&1; then return 0; fi
  for secret in database-password db-password fitclub-db-password database-url; do
    if gcloud secrets describe "$secret" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
      local val
      val="$(gcloud secrets versions access latest --secret="$secret" --project="$GCP_PROJECT_ID" 2>/dev/null | tr -d '\r\n')"
      if [ -n "$val" ]; then
        if [ "$secret" = "database-url" ]; then
          val="$(echo "$val" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' | sed 's|%| |g')"
        fi
        if [ -n "$val" ]; then
          DB_PASSWORD="$val"
          export DB_PASSWORD
          echo "✅ Using password from Secret Manager ($secret)"
          return 0
        fi
      fi
    fi
  done
  return 1
}

urlencode() {
  if command -v node >/dev/null 2>&1; then
    node -p "encodeURIComponent(process.argv[1])" "$1"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
  else
    echo "$1"
  fi
}

if [ ! -f ".env" ]; then
  touch .env
  echo "📝 Created .env"
fi

if [ -z "${DB_PASSWORD:-}" ]; then
  try_get_password || true
fi

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "Enter database password for ${DB_USER} (Cloud SQL):"
  read -sp "Password: " DB_PASSWORD
  echo ""
fi

ENCODED_PASSWORD="$(urlencode "$DB_PASSWORD")"
DATABASE_URL="postgresql://${DB_USER}:${ENCODED_PASSWORD}@127.0.0.1:${PROXY_PORT}/${DB_NAME}?schema=public"

if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  fi
  echo "✅ Updated DATABASE_URL in .env"
else
  echo "" >> .env
  echo "# Cloud SQL via proxy (local dev)" >> .env
  echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  echo "✅ Added DATABASE_URL to .env"
fi

# Ensure NODE_ENV and JWT_SECRET exist
if ! grep -q "^NODE_ENV=" .env 2>/dev/null; then
  echo "NODE_ENV=development" >> .env
fi
if ! grep -q "^PORT=" .env 2>/dev/null; then
  echo "PORT=8080" >> .env
fi
if ! grep -q "^JWT_SECRET=" .env 2>/dev/null; then
  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "fitclub-dev-secret-change-me")
  echo "JWT_SECRET=\"${JWT_SECRET}\"" >> .env
  echo "✅ Generated JWT_SECRET"
fi
if ! grep -q "^GCP_PROJECT_ID=" .env 2>/dev/null; then
  echo "GCP_PROJECT_ID=${GCP_PROJECT_ID}" >> .env
fi

echo ""
echo "✅ Done. Next:"
echo "   1. Start proxy:  cd backend/scripts && ./start-cloud-sql-proxy.sh"
echo "   2. Run Prisma:   cd backend && npx prisma migrate deploy"
echo "   3. Start API:    cd backend && npm run dev"
echo ""
