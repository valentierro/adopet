# Deploy do painel admin na Hostinger (admin.appadopet.com.br)

## Se o app Node.js na Hostinger está conectado ao repositório principal (adopet)

O painel está em **`apps/admin-web`** dentro do monorepo. Para cada deploy usar esse código:

1. No painel da Hostinger → seu **Node.js Web App** (admin.appadopet.com.br).
2. Confirme que está conectado ao repositório correto (ex.: `valentierro/adopet`) e ao branch **`main`**.
3. **Configuração de build:**
   - **Root directory / Pasta raiz:** `apps/admin-web`
   - **Build command:**  
     `pnpm install && pnpm run build`  
     (ou, se a Hostinger rodar o install na raiz do repo: primeiro instale dependências na raiz, depois algo como `cd apps/admin-web && pnpm install --frozen-lockfile && pnpm run build`)
   - **Variável de ambiente no build:**  
     `VITE_API_URL=https://api.appadopet.com.br/v1`  
     (ou a URL real da sua API em produção)
   - **Output / Pasta de saída:** `dist` (a Hostinger deve servir os arquivos estáticos da pasta `dist/`).

4. Salve e faça **Redeploy** (ou dê um push no `main` para disparar o deploy automático).

Assim, sempre que você der push no `main` do repo **adopet**, o painel admin será atualizado com o código de `apps/admin-web`.

---

## Se o app na Hostinger está conectado a outro repositório (ex.: "adminadopet")

Se a Hostinger mostrar algo como **"From pushes to: adminadopet"**, então ela está usando **outro repositório**. Aí você tem duas opções:

### Opção A – Passar a usar o monorepo (recomendado)

1. No painel da Hostinger, troque a conexão do repositório para o repo principal (**adopet**), branch **main**.
2. Defina **Root directory** = `apps/admin-web` e o **Build command** como acima.
3. Configure `VITE_API_URL` e **Redeploy**.

Assim o painel passa a ser atualizado sempre que você der push no `main` do adopet.

### Opção B – Manter o repo separado e só atualizar o código

1. No seu computador, dentro do monorepo:
   ```bash
   cd /caminho/adopet
   pnpm run build --filter adopet-admin-web
   # ou: cd apps/admin-web && pnpm run build
   ```
2. Copie **todo o conteúdo** de `apps/admin-web/dist/` para o outro repositório (ex.: na pasta raiz ou na pasta que a Hostinger usa como “output”).
3. Faça commit e push nesse repo "adminadopet" para a Hostinger fazer o deploy.

Ou copie o código fonte de `apps/admin-web/` (exceto `node_modules` e `dist`) para esse repo e configure lá o mesmo build (`pnpm run build` e `VITE_API_URL`).

---

## Conferir se a API permite o painel (CORS)

A API precisa permitir requisições de `https://admin.appadopet.com.br`.  
No projeto da API (ex.: Vercel), a variável `CORS_ORIGINS` (ou o `vercel.json`) deve incluir `https://admin.appadopet.com.br`.

---

## Resumo rápido para “atualizar no painel”

- **Deploy a partir do repo principal:**  
  Root = `apps/admin-web`, build = `pnpm install && pnpm run build`, `VITE_API_URL` definida → **Redeploy** ou push no `main`.
- **Deploy a partir de outro repo:**  
  Atualize esse repo com o conteúdo de `apps/admin-web` (ou só o `dist/` após o build) e faça push / Redeploy na Hostinger.
