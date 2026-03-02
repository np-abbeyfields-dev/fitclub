#!/bin/sh
# Start Cloud SQL Auth Proxy then the Node app (TCP so Prisma works on Cloud Run).
set -e

CONNECTION_NAME="${CLOUD_SQL_CONNECTION_NAME}"
PROXY_PORT="${PROXY_PORT:-5432}"

if [ -z "$CONNECTION_NAME" ]; then
  echo "[entrypoint] CLOUD_SQL_CONNECTION_NAME not set, skipping proxy"
  exec node dist/app.js
fi

echo "[entrypoint] Starting Cloud SQL Proxy for ${CONNECTION_NAME} on 127.0.0.1:${PROXY_PORT}"
/cloud-sql-proxy "${CONNECTION_NAME}" --port="${PROXY_PORT}" --address=127.0.0.1 &
sleep 3

# Run app as nodejs user if it exists
if id nodejs >/dev/null 2>&1; then
  exec su-exec nodejs node dist/app.js
else
  exec node dist/app.js
fi
