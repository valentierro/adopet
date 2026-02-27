#!/usr/bin/env bash
# Abre o app no simulador iOS (requer Metro rodando ou inicia automaticamente)
cd "$(dirname "$0")/.."
export COREPACK_HOME="${COREPACK_HOME:-$(pwd)/.cache/corepack}"
cd apps/mobile && pnpm ios
