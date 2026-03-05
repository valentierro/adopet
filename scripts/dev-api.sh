#!/usr/bin/env bash
# Sobe a API em modo desenvolvimento (carrega .env.development + .env)
cd "$(dirname "$0")/.."
export COREPACK_HOME="${COREPACK_HOME:-$(pwd)/.cache/corepack}"
export NODE_ENV=development
pnpm dev:api
