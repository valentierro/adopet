#!/usr/bin/env bash
# Gera build iOS (para App Store) via EAS
# Requer: eas-cli, login no EAS, variáveis no EAS (GOOGLE_MAPS_API_KEY_IOS, etc.)
cd "$(dirname "$0")/.."
echo "Gerando build iOS (production)..."
pnpm --filter mobile run build:ios
