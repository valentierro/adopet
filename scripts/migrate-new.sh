#!/usr/bin/env bash
# Cria e aplica uma nova migration. Uso: ./scripts/migrate-new.sh "nome_da_migration"
if [ -z "$1" ]; then
  echo "Uso: ./scripts/migrate-new.sh \"nome_da_migration\""
  echo "Ex.: ./scripts/migrate-new.sh \"add_user_phone\""
  exit 1
fi
cd "$(dirname "$0")/.."
echo "Criando migration: $1"
cd apps/api && pnpm exec prisma migrate dev --name "$1" && cd ../..
echo "✓ Migration criada e aplicada"
