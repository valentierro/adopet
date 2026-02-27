#!/usr/bin/env bash
# Para e remove containers da infraestrutura
cd "$(dirname "$0")/.."
echo "Parando infraestrutura..."
docker compose -f infra/docker-compose.yml down
echo "✓ Containers parados"
