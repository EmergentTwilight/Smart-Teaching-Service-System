#!/bin/sh

set -eu

cd /app

corepack enable

FINGERPRINT_FILE="/app/node_modules/.stss-install-fingerprint"

compute_fingerprint() {
  {
    cat /app/package.json
    cat /app/pnpm-lock.yaml
    cat /app/pnpm-workspace.yaml
    cat /app/backend/package.json
    cat /app/frontend/package.json
    cat /app/shared/package.json
  } | sha256sum | awk '{print $1}'
}

CURRENT_FINGERPRINT="$(compute_fingerprint)"
INSTALLED_FINGERPRINT=""

if [ -f "$FINGERPRINT_FILE" ]; then
  INSTALLED_FINGERPRINT="$(cat "$FINGERPRINT_FILE" 2>/dev/null || true)"
fi

if [ -f /app/node_modules/.modules.yaml ] && [ -z "$INSTALLED_FINGERPRINT" ]; then
  echo "[bootstrap] 检测到已有依赖，补写指纹"
  mkdir -p /app/node_modules
  printf '%s' "$CURRENT_FINGERPRINT" > "$FINGERPRINT_FILE"
elif [ ! -d /app/node_modules ] || [ ! -f /app/node_modules/.modules.yaml ] || [ "$CURRENT_FINGERPRINT" != "$INSTALLED_FINGERPRINT" ]; then
  echo "[bootstrap] 依赖缺失或已变更，执行 pnpm install"
  pnpm install
  mkdir -p /app/node_modules
  printf '%s' "$CURRENT_FINGERPRINT" > "$FINGERPRINT_FILE"
else
  echo "[bootstrap] 依赖未变化，跳过 pnpm install"
fi

exec sh -c "$1"
