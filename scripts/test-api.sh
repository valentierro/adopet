#!/usr/bin/env bash
# Roda os testes unitários da API
cd "$(dirname "$0")/.."
pnpm --filter api test "$@"
