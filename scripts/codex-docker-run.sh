#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 '<command to run inside docker>'" >&2
  echo "Example: $0 'pnpm --filter @stss/server typecheck'" >&2
  echo "Example: $0 'pnpm --filter @stss/web typecheck'" >&2
  exit 2
fi

CMD="$*"

# STSS Docker Compose services:
# - server: backend dev server, localhost:3000; preferred for backend/typecheck/prisma/root workspace checks
# - web: frontend dev server, localhost:5173; preferred for frontend/web checks
# - test-server: test helper service; use only when explicitly requested
#
# Override when needed:
#   CODEX_DOCKER_SERVICE=server ./scripts/codex-docker-run.sh 'pnpm --filter @stss/server typecheck'
#   CODEX_DOCKER_SERVICE=web ./scripts/codex-docker-run.sh 'pnpm --filter @stss/web typecheck'
#   CODEX_DOCKER_SERVICE=test-server ./scripts/codex-docker-run.sh 'pnpm test'
#
# Override workdir when needed:
#   CODEX_DOCKER_WORKDIR=/workspace ./scripts/codex-docker-run.sh 'pwd'
WORKDIR="${CODEX_DOCKER_WORKDIR:-/app}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found. Please start Docker Desktop / Docker Engine first." >&2
  exit 127
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is not available." >&2
  exit 127
fi

# Auto-select service unless explicitly overridden.
if [ -n "${CODEX_DOCKER_SERVICE:-}" ]; then
  SERVICE="$CODEX_DOCKER_SERVICE"
  SERVICE_REASON="explicit CODEX_DOCKER_SERVICE"
else
  # If the command clearly targets the web package, use web.
  # If it targets backend/server/prisma/db, use server.
  # If both appear, prefer server because it is the safer root workspace/check environment.
  CMD_LOWER="$(printf '%s' "$CMD" | tr '[:upper:]' '[:lower:]')"

  IS_WEB=0
  IS_SERVER=0

  case "$CMD_LOWER" in
    *"@stss/web"*|*"frontend"*|*"vite"*|*"src/modules/course-selection"*".tsx"*|*"src/modules/course-selection"*".jsx"*)
      IS_WEB=1
      ;;
  esac

  case "$CMD_LOWER" in
    *"@stss/server"*|*"backend"*|*"prisma"*|*"migrate"*|*"migration"*|*"seed"*|*"express"*)
      IS_SERVER=1
      ;;
  esac

  if [ "$IS_WEB" -eq 1 ] && [ "$IS_SERVER" -eq 0 ]; then
    SERVICE="web"
    SERVICE_REASON="auto-selected web from command"
  else
    SERVICE="server"
    if [ "$IS_WEB" -eq 1 ] && [ "$IS_SERVER" -eq 1 ]; then
      SERVICE_REASON="auto-selected server because command mentions both web and server/backend"
    elif [ "$IS_SERVER" -eq 1 ]; then
      SERVICE_REASON="auto-selected server from command"
    else
      SERVICE_REASON="auto-selected server as default STSS check environment"
    fi
  fi
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
echo "[codex-docker-run] selection reason: $SERVICE_REASON"
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
