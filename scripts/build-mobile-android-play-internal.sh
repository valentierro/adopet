#!/usr/bin/env bash
# Build Android para Testes internos no Google Play (AAB com API de dev).
# Usa o perfil "play-internal" do EAS (API de dev); gera AAB para subir em Play Console → Testes internos.
# Requer: eas-cli, login no EAS. Rode a partir da raiz do repo.
set -e
cd "$(dirname "$0")/.."

echo "Build Android (Testes internos — Play) — perfil play-internal, API de dev"
pnpm --filter mobile run build:android:play-internal
