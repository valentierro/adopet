#!/bin/sh
# Rode isso DENTRO da pasta adopetlanding-repo (clone do repo adopetlanding)
# Para integrar o remoto e fazer o push das suas alterações.

set -e
echo "=== 1. Buscando e integrando o remoto (pull) ==="
git pull origin main --no-rebase

echo ""
echo "=== 2. Enviando suas alterações (push) ==="
git push origin main

echo ""
echo "Pronto. O repo adopetlanding está atualizado."
