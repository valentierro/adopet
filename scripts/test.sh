#!/usr/bin/env bash
# Roda os testes de todos os pacotes
cd "$(dirname "$0")/.."
export COREPACK_HOME="${COREPACK_HOME:-$(pwd)/.cache/corepack}"
pnpm test
