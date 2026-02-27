#!/usr/bin/env bash
# Sobe o app mobile (Expo). Pressione 'i' para iOS ou 'a' para Android
cd "$(dirname "$0")/.."
export COREPACK_HOME="${COREPACK_HOME:-$(pwd)/.cache/corepack}"
pnpm dev:mobile
