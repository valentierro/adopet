#!/usr/bin/env bash
# Build Android para preview/dev (APK interno).
# Usa o perfil "preview" do EAS; a URL da API vem das variáveis do ambiente Preview no Expo.
# Requer: eas-cli, login no EAS. Configure EXPO_PUBLIC_API_URL para Preview no expo.dev (ex.: URL do deploy Vercel Preview).
set -e
cd "$(dirname "$0")/.."

echo "Build Android (preview/dev) — API definida no EAS (ambiente Preview)"
pnpm --filter mobile run build:android:preview
