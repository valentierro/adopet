# Sincronizar admin-web com o repositório adminadopet (deploy Hostinger)

O painel admin em produção usa o repositório **https://github.com/valentierro/adminadopet**.  
O código fonte fica em `apps/admin-web/` dentro do monorepo Adopet. Para publicar alterações e disparar o deploy na Hostinger, use o fluxo abaixo.

---

## Opção A: Copiar arquivos e dar push no repo adminadopet (recomendado)

1. **Clone o repositório do admin** (em uma pasta fora do monorepo, se ainda não tiver):

   ```bash
   cd ~/Documents   # ou outro diretório
   git clone https://github.com/valentierro/adminadopet.git adminadopet-repo
   cd adminadopet-repo
   ```

2. **Copie o conteúdo de `apps/admin-web`** sobre o clone (substituindo arquivos, exceto `.git`):

   ```bash
   # Ajuste ADOPET_ROOT se o monorepo estiver em outro lugar
   ADOPET_ROOT="/Users/ericksantos/Documents/erick/auto/adopet"
   rsync -av --delete \
     --exclude=node_modules \
     --exclude=dist \
     --exclude=.git \
     --exclude=.env \
     --exclude=".env.*" \
     "$ADOPET_ROOT/apps/admin-web/" \
     ./
   ```

   Se não tiver `rsync`, copie manualmente (via Finder/Explorador) todo o conteúdo de `apps/admin-web/` para dentro de `adminadopet-repo/`, exceto `node_modules`, `dist` e `.git`.

3. **Commit e push no repositório adminadopet**:

   ```bash
   git add .
   git status
   git commit -m "chore: sync admin-web from monorepo"
   git push origin main
   ```

4. O deploy na Hostinger será disparado automaticamente se estiver configurado (webhook ou pipeline ligado ao repo). Caso contrário, faça o deploy manual pelo painel da Hostinger.

---

## Opção B: Usar o script de sync

No monorepo Adopet, há um script que prepara o sync:

```bash
./scripts/admin-push-to-adminadopet.sh
```

Esse script espera que a variável `ADMINADOPET_REPO` aponte para o caminho do clone do repositório adminadopet (ex.: `~/Documents/adminadopet-repo`). Ele faz o rsync e, em seguida, você entra na pasta do repo e faz o commit/push manualmente (para evitar erros de credenciais no script).

---

## Variáveis de ambiente em produção

No projeto adminadopet (Hostinger), configure:

- **VITE_API_URL** — URL da API em produção (ex.: `https://api.adopet.com.br/v1`).

O build do Vite gera arquivos estáticos que usam essa URL em tempo de build.

---

## Build local (testar antes de publicar)

Dentro de `apps/admin-web` (ou no clone após o sync):

```bash
pnpm install
pnpm run build
pnpm run preview   # opcional: testar o build localmente
```
