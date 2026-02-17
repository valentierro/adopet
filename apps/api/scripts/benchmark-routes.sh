#!/usr/bin/env bash
# Uso: BASE_URL=http://localhost:3000/v1 JWT=seu_token ./scripts/benchmark-routes.sh
# Mede o header X-Response-Time de rotas principais (requer JWT para feed/conversas/favorites).

set -e
BASE="${BASE_URL:-http://localhost:3000/v1}"
JWT="${JWT:-}"

echo "Base URL: $BASE"
echo ""

if [ -z "$JWT" ]; then
  echo "JWT não definido. Rotas autenticadas serão ignoradas."
  echo "Exemplo: JWT=eyJhbGc... ./scripts/benchmark-routes.sh"
  echo ""
fi

measure() {
  local name="$1"
  local path="$2"
  local opts=(-s -D - -o /dev/null "$BASE$path")
  if [ -n "$JWT" ]; then
    opts=(-H "Authorization: Bearer $JWT" "${opts[@]}")
  fi
  local line
  line=$(curl "${opts[@]}" 2>/dev/null | grep -i x-response-time || echo "X-Response-Time: ?")
  echo "$name: $line"
}

echo "--- Rotas públicas ---"
measure "GET /health" "/health"
measure "GET /public/stats" "/public/stats"

if [ -n "$JWT" ]; then
  echo ""
  echo "--- Rotas autenticadas ---"
  measure "GET /feed" "/feed"
  measure "GET /conversations" "/conversations"
  measure "GET /favorites" "/favorites"
  measure "GET /me" "/me"
fi

echo ""
echo "Concluído. X-Response-Time = tempo no servidor (ms)."
