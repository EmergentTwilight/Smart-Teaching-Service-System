#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 '<command to run inside docker>'" >&2
  echo "Example: $0 'pnpm --filter @stss/server typecheck'" >&2
  exit 2
fi

CMD="$*"

# STSS Docker Compose services:
# - server: backend dev server, localhost:3000
# - web: frontend dev server, localhost:5173
# - test-server: preferred service for Codex checks/typecheck/build/test
SERVICE="${CODEX_DOCKER_SERVICE:-test-server}"
WORKDIR="${CODEX_DOCKER_WORKDIR:-/app}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found. Please start Docker Desktop / Docker Engine first." >&2
  exit 127
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is not available." >&2
  exit 127
fi

SERVICES="$(docker compose config --services)"
if ! printf '%s\n' "$SERVICES" | grep -qx "$SERVICE"; then
  echo "Docker Compose service '$SERVICE' does not exist." >&2
  echo "Available services:" >&2
  printf '%s\n' "$SERVICES" >&2
  exit 2
fi

RUNNER='
set -eu

WORKDIR="${CODEX_INNER_WORKDIR:-/app}"

if [ -d "$WORKDIR" ]; then
  cd "$WORKDIR"
elif [ -d /app ]; then
  cd /app
elif [ -d /workspace ]; then
  cd /workspace
elif [ -d /usr/src/app ]; then
  cd /usr/src/app
else
  echo "Could not find project workdir." >&2
  echo "Tried: $WORKDIR, /app, /workspace, /usr/src/app" >&2
  echo "Please set CODEX_DOCKER_WORKDIR." >&2
  exit 2
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

echo "[codex-docker-run] service: ${CODEX_INNER_SERVICE:-unknown}"
echo "[codex-docker-run] pwd: $(pwd)"
echo "[codex-docker-run] command: $CODEX_INNER_CMD"
echo "[codex-docker-run] node: $(node -v 2>/dev/null || true)"
echo "[codex-docker-run] pnpm path: $(command -v pnpm 2>/dev/null || echo not-found)"

sh -lc "$CODEX_INNER_CMD"
'

echo "[codex-docker-run] target service: $SERVICE"
echo "[codex-docker-run] target workdir: $WORKDIR"

if docker compose ps --services --filter status=running | grep -qx "$SERVICE"; then
  docker compose exec -T \
    -e CODEX_INNER_SERVICE="$SERVICE" \
    -e CODEX_INNER_WORKDIR="$WORKDIR" \
    -e CODEX_INNER_CMD="$CMD" \
    "$SERVICE" sh -lc "$RUNNER"
else
  echo "[codex-docker-run] service '$SERVICE' is not running; using docker compose run --rm."
  docker compose run --rm \
    -e CODEX_INNER_SERVICE="$SERVICE" \
    -e CODEX_INNER_WORKDIR="$WORKDIR" \
    -e CODEX_INNER_CMD="$CMD" \
    "$SERVICE" sh -lc "$RUNNER"
fi
