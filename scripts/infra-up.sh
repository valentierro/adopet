#!/usr/bin/env bash
# Sobe PostgreSQL (e opcionalmente Redis) via Docker
cd "$(dirname "$0")/.."
echo "Subindo infraestrutura..."
docker compose -f infra/docker-compose.yml up -d
echo "✓ PostgreSQL rodando em localhost:5432"
echo "  Redis (opcional): docker compose -f infra/docker-compose.yml --profile with-redis up -d"
