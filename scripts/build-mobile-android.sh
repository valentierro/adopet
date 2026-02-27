#!/usr/bin/env bash
# Gera build Android (AAB para Play Store) via EAS
# Requer: eas-cli, login no EAS, variáveis no EAS (GOOGLE_MAPS_API_KEY, etc.)
cd "$(dirname "$0")/.."
echo "Gerando build Android (production)..."
pnpm --filter mobile run build:android
