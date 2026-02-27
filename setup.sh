#!/usr/bin/env bash
# Setup do repositório Adopet — Mac/Linux
# Execute na raiz do projeto: ./setup.sh
# Para ambiente cloud (Neon, Vercel, sem Docker): ./setup.sh --cloud

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CLOUD_MODE=false
[[ "$1" == "--cloud" ]] || [[ "$SETUP_CLOUD" == "1" ]] && CLOUD_MODE=true

echo "=== Adopet Setup ==="
$CLOUD_MODE && echo "(modo cloud: Neon, API Vercel — sem Docker)"
echo ""

# 1. Node.js >= 18
if ! command -v node &>/dev/null; then
  echo "Erro: Node.js não encontrado. Instale Node.js >= 18 (https://nodejs.org)"
  exit 1
fi
NODE_MAJOR=$(node -v | cut -d. -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 18 ] 2>/dev/null; then
  echo "Erro: Node.js >= 18 necessário. Atual: $(node -v)"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 2. Docker (opcional no modo cloud)
if ! $CLOUD_MODE; then
  if ! command -v docker &>/dev/null; then
    echo "Erro: Docker não encontrado. Instale Docker (https://docs.docker.com/get-docker/)"
    echo "  Ou use: ./setup.sh --cloud (Neon + API Vercel, sem Docker)"
    exit 1
  fi
  if ! docker info &>/dev/null; then
    echo "Erro: Docker não está rodando. Inicie o Docker Desktop."
    echo "  Ou use: ./setup.sh --cloud (Neon + API Vercel, sem Docker)"
    exit 1
  fi
  echo "✓ Docker OK"
fi

# 3. pnpm (via Corepack)
export COREPACK_HOME="${COREPACK_HOME:-$ROOT/.cache/corepack}"
corepack enable 2>/dev/null || true
corepack prepare pnpm@9.0.0 --activate 2>/dev/null || true
if ! command -v pnpm &>/dev/null; then
  echo "Erro: pnpm não encontrado. Rode: corepack enable && corepack prepare pnpm@9.0.0 --activate"
  exit 1
fi
echo "✓ pnpm $(pnpm -v)"

# 4. Instalar dependências
echo ""
echo "Instalando dependências..."
pnpm install

# 5. Build do shared
echo ""
echo "Buildando @adopet/shared..."
pnpm --filter @adopet/shared build

# 6. Arquivos .env
for app in api mobile admin-web; do
  ENV_FILE="apps/$app/.env"
  EXAMPLE="apps/$app/.env.example"
  if [ ! -f "$ENV_FILE" ] && [ -f "$EXAMPLE" ]; then
    cp "$EXAMPLE" "$ENV_FILE"
    echo "✓ Criado $ENV_FILE"
  fi
done

# 7. DATABASE_URL (só em modo local)
if ! $CLOUD_MODE; then
  API_ENV="apps/api/.env"
  if [ -f "$API_ENV" ]; then
    if ! grep -q 'postgresql://adopet:adopet@localhost:5432/adopet' "$API_ENV" 2>/dev/null; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://adopet:adopet@localhost:5432/adopet"|' "$API_ENV"
      else
        sed -i 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://adopet:adopet@localhost:5432/adopet"|' "$API_ENV"
      fi
      echo "✓ DATABASE_URL configurado para PostgreSQL local"
    fi
  fi

  # 8. Subir PostgreSQL
  echo ""
  echo "Subindo PostgreSQL (Docker)..."
  pnpm infra:up

  # 9. Aguardar Postgres
  echo ""
  echo "Aguardando PostgreSQL ficar pronto..."
  for i in {1..30}; do
    if docker exec adopet-postgres pg_isready -U adopet -d adopet 2>/dev/null; then
      break
    fi
    sleep 1
    if [ "$i" -eq 30 ]; then
      echo "Erro: PostgreSQL não ficou pronto em 30s"
      exit 1
    fi
  done
  echo "✓ PostgreSQL pronto"

  # 10. Migrations e seed
  echo ""
  echo "Aplicando migrations e seed do banco..."
  cd apps/api
  pnpm exec prisma migrate deploy
  pnpm prisma:seed
  cd "$ROOT"
fi

echo ""
echo "=== Setup concluído ==="
echo ""
if $CLOUD_MODE; then
  echo "Modo cloud: configure os .env com suas credenciais:"
  echo "  - apps/api/.env  → DATABASE_URL (Neon), JWT_SECRET, etc."
  echo "  - apps/mobile/.env → EXPO_PUBLIC_API_URL (URL da API na Vercel)"
  echo ""
fi
echo "Próximos passos:"
echo "  Mobile: pnpm dev:mobile"
echo "  API:    pnpm dev:api  (se rodar localmente)"
echo "  Ou:     pnpm dev"
echo ""
