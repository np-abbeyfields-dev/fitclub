#!/bin/bash

# Start Cloud SQL Proxy for FitClub local dev

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/gcp.config.sh"

PROXY_PORT="${PROXY_PORT:-5433}"

echo "🚀 Starting Cloud SQL Proxy (FitClub)..."
echo "   Connection: ${CONNECTION_NAME}"
echo "   Port: ${PROXY_PORT}"
echo ""

cd "$SCRIPT_DIR"

# macOS: allow binary to run
if [[ "$(uname -s)" == "Darwin" ]] && command -v xattr >/dev/null 2>&1; then
  xattr -d com.apple.quarantine "./cloud-sql-proxy" 2>/dev/null || true
fi

# Kill existing proxy for this instance
pkill -f "cloud-sql-proxy.*${CONNECTION_NAME}" 2>/dev/null || true
sleep 1

if [ ! -f "./cloud-sql-proxy" ]; then
  echo "📥 Downloading Cloud SQL Proxy..."
  OS="$(uname -s)"
  ARCH="$(uname -m)"
  if [[ "$OS" == "Darwin" ]]; then
    [[ "$ARCH" == "arm64" ]] && S="arm64" || S="amd64"
    curl -sL -o cloud-sql-proxy "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.${S}"
  elif [[ "$OS" == "Linux" ]]; then
    [[ "$ARCH" == "aarch64" ]] && S="arm64" || S="amd64"
    curl -sL -o cloud-sql-proxy "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.${S}"
  else
    echo "Unsupported OS: $OS"; exit 1
  fi
  chmod +x cloud-sql-proxy
  if [[ "$(uname -s)" == "Darwin" ]]; then
    xattr -d com.apple.quarantine "./cloud-sql-proxy" 2>/dev/null || true
  fi
  echo "✅ Downloaded"
fi

./cloud-sql-proxy "$CONNECTION_NAME" --port "$PROXY_PORT" > /tmp/cloud-sql-proxy-fitclub.log 2>&1 &
PID=$!
sleep 3

if ! lsof -i :$PROXY_PORT >/dev/null 2>&1; then
  echo "❌ Proxy failed. Logs:"
  tail -20 /tmp/cloud-sql-proxy-fitclub.log
  kill $PID 2>/dev/null || true
  exit 1
fi

echo "✅ Proxy running on port ${PROXY_PORT} (PID $PID)"
echo "   Stop: pkill -f 'cloud-sql-proxy.*${CONNECTION_NAME}'"
echo ""
wait $PID
