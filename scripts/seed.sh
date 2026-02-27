#!/usr/bin/env bash
# Executa o seed do banco (usuário admin-teste + pets)
cd "$(dirname "$0")/.."
echo "Executando seed..."
cd apps/api && pnpm prisma:seed && cd ../..
echo "✓ Seed concluído"
