#!/usr/bin/env bash
# Sobe a API em modo desenvolvimento
cd "$(dirname "$0")/.."
export COREPACK_HOME="${COREPACK_HOME:-$(pwd)/.cache/corepack}"
pnpm dev:api
