#!/usr/bin/env bash
# Usar cache do Corepack dentro do projeto (evita erro de permissão em ~/.cache)
cd "$(dirname "$0")/.."
export COREPACK_HOME="${COREPACK_HOME:-$(pwd)/.cache/corepack}"
exec pnpm "$@"
