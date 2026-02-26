#!/usr/bin/env bash
# Busca o spec OpenAPI da API em execução e salva em docs/swagger/openapi.json
# Uso: ./scripts/fetch-openapi.sh [URL]
# Ex.: ./scripts/fetch-openapi.sh
#      ./scripts/fetch-openapi.sh http://localhost:3000

set -e
BASE="${1:-http://localhost:3000}"
URL="${BASE}/api/docs-json"
OUT="docs/swagger/openapi.json"

echo "Buscando OpenAPI spec de ${URL}..."
mkdir -p "$(dirname "$OUT")"
curl -sS "$URL" -o "$OUT"
echo "Salvo em ${OUT}"
echo "Abra docs/swagger/index.html ou use ?url=${URL} para ver a doc com Try it out."
