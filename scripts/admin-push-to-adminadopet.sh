#!/bin/sh
# Sincroniza apps/admin-web do monorepo Adopet para o repositório adminadopet
# para depois fazer push e disparar deploy na Hostinger.
#
# Uso:
#   export ADMINADOPET_REPO=/caminho/para/adminadopet-repo   # clone do repo adminadopet
#   ./scripts/admin-push-to-adminadopet.sh
#
# Depois, entre na pasta do repo e faça commit + push:
#   cd "$ADMINADOPET_REPO"
#   git add .
#   git status
#   git commit -m "chore: sync admin-web from monorepo"
#   git push origin main

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADOPET_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="$ADOPET_ROOT/apps/admin-web"

if [ -z "$ADMINADOPET_REPO" ]; then
  echo "Erro: defina ADMINADOPET_REPO com o caminho do clone do repositório adminadopet."
  echo "Exemplo: export ADMINADOPET_REPO=$HOME/Documents/adminadopet-repo"
  exit 1
fi

if [ ! -d "$SOURCE" ]; then
  echo "Erro: pasta não encontrada: $SOURCE"
  exit 1
fi

if [ ! -d "$ADMINADOPET_REPO/.git" ]; then
  echo "Erro: não parece ser um clone git: $ADMINADOPET_REPO"
  exit 1
fi

echo "=== Sincronizando admin-web -> adminadopet ==="
echo "Origem:  $SOURCE"
echo "Destino: $ADMINADOPET_REPO"
echo ""

rsync -av --delete \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  --exclude=.env \
  --exclude=".env.*" \
  "$SOURCE/" \
  "$ADMINADOPET_REPO/"

echo ""
echo "Sync concluído. Próximos passos:"
echo "  cd $ADMINADOPET_REPO"
echo "  git add ."
echo "  git status"
echo "  git commit -m \"chore: sync admin-web from monorepo\""
echo "  git push origin main"
echo ""
echo "Isso disparará o deploy na Hostinger (se configurado)."
