#!/usr/bin/env bash
# Cria arquivos .env a partir dos .env.example (apenas se .env não existir)
cd "$(dirname "$0")/.."
for app in api mobile admin-web; do
  ENV_FILE="apps/$app/.env"
  EXAMPLE="apps/$app/.env.example"
  if [ ! -f "$ENV_FILE" ] && [ -f "$EXAMPLE" ]; then
    cp "$EXAMPLE" "$ENV_FILE"
    echo "✓ Criado $ENV_FILE"
  else
    echo "  $ENV_FILE já existe ou $EXAMPLE não encontrado"
  fi
done
