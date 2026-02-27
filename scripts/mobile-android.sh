#!/usr/bin/env bash
# Abre o app no emulador Android (requer Android Studio e emulador configurado)
cd "$(dirname "$0")/.."
export COREPACK_HOME="${COREPACK_HOME:-$(pwd)/.cache/corepack}"
cd apps/mobile && pnpm android
