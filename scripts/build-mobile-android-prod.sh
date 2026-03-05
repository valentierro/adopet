#!/usr/bin/env bash
# Build Android para produção (AAB para Play Store).
# Já seta EXPO_PUBLIC_API_URL para a API de prod (o perfil production no eas.json também define isso).
# Requer: eas-cli, login no EAS, variáveis no EAS (GOOGLE_MAPS_API_KEY, etc.)
set -e
cd "$(dirname "$0")/.."

export EXPO_PUBLIC_API_URL="https://adopet-api-six.vercel.app"
echo "Build Android (produção) — API: $EXPO_PUBLIC_API_URL"
pnpm --filter mobile run build:android
