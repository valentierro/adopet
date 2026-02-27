#!/usr/bin/env bash
# Aplica migrations do Prisma (migrate deploy — para banco existente)
# Para criar nova migration: ./scripts/migrate-new.sh "nome_da_migration"
cd "$(dirname "$0")/.."
echo "Aplicando migrations..."
cd apps/api && pnpm exec prisma migrate deploy && cd ../..
echo "✓ Migrations aplicadas"
