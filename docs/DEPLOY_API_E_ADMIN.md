# Deploy: API + Portal Admin

Passos para colocar em produção a **API** (Vercel) e o **Portal Admin** (Hostinger).

---

## Ordem recomendada

1. **API** primeiro (para o portal e o app usarem a versão nova).
2. **Portal Admin** em seguida.

---

## 1. Deploy da API (Vercel)

### Opção A – Deploy automático (recomendado)

1. No repositório **adopet**, faça commit e push das alterações da API para o branch que a Vercel usa (geralmente `main`):
   ```bash
   cd /caminho/adopet
   git add apps/api/
   git status   # confira o que vai subir
   git commit -m "feat(api): feature flags no banco, auth lê REQUIRE_EMAIL_VERIFICATION do DB, seed da flag"
   git push origin main
   ```
2. A Vercel faz o deploy sozinha quando detectar o push (se o projeto estiver ligado ao repo).
3. Confira: abra `https://sua-api.vercel.app/v1/health` (ou a URL da sua API) e veja se retorna `{"status":"ok"}`.

### Opção B – Deploy manual na Vercel

1. Acesse [vercel.com](https://vercel.com) → projeto da **API** (Root Directory = `apps/api`).
2. Aba **Deployments** → no último deploy, menu (⋯) → **Redeploy**.
3. Ou **Deploy** → escolha o branch (ex.: `main`) e confirme.

### Variáveis de ambiente (API)

Em **Settings → Environment Variables** do projeto da API na Vercel, confira para **Production**:

- `DATABASE_URL` – banco de produção
- `JWT_SECRET`
- `CORS_ORIGINS` – deve incluir `https://admin.appadopet.com.br` para o portal admin
- Outras que a API use (Stripe, S3, e-mail, etc.)

### Banco de dados (API)

- A tabela `FeatureFlag` deve existir (migration já aplicada).
- (Opcional) Para criar a flag de e-mail no banco: rode o seed em produção uma vez, ou use a API/portal para ligar/desligar a flag (a API já devolve a flag “conhecida” mesmo sem registro no banco).

---

## 2. Deploy do Portal Admin (Hostinger)

O portal está em **admin.appadopet.com.br** e usa o repositório **adminadopet** na Hostinger.

### Opção A – Hostinger conectada ao GitHub (adminadopet)

1. O código já está no repo **adminadopet** (ícones no menu, página Feature flags).
2. No painel da Hostinger → **Node.js Web App** do admin.
3. Aba **Deploy** ou **Git** → **Redeploy** / **Deploy now** para disparar um novo build a partir do último commit do `main` do adminadopet.

Se o deploy for automático a cada push, basta ter dado push no adminadopet (já feito) e aguardar, ou forçar um Redeploy.

### Opção B – Build local e upload manual

Se a Hostinger não fizer build a partir do Git:

1. No monorepo, build do admin com a URL da API de produção:
   ```bash
   cd /caminho/adopet
   VITE_API_URL=https://api.appadopet.com.br/v1 pnpm run build:admin
   ```
   (ou use a URL real da sua API, **com** `/v1`, sem barra no final.)

2. A pasta gerada é `apps/admin-web/dist/`.
3. Envie **todo o conteúdo** de `dist/` (não a pasta `dist` em si) para a pasta pública do subdomínio do admin na Hostinger (FTP ou gerenciador de arquivos), mantendo:
   - `index.html` na raiz
   - Pasta `assets/` com os JS e CSS
   - `logo.png` e `.htaccess` na raiz

### Variável no build do portal

O portal chama a API usando `VITE_API_URL`. No build **precisa** estar definida, por exemplo:

- `VITE_API_URL=https://api.appadopet.com.br/v1`

Na Hostinger, se houver campo de variáveis de ambiente no build, configure essa variável lá. Se fizer build local, use como no comando acima.

---

## Resumo rápido

| O quê           | Onde        | Ação |
|-----------------|------------|------|
| **API**         | Vercel     | Push no `main` do repo **adopet** (deploy automático) ou Redeploy no dashboard da Vercel. |
| **Portal Admin**| Hostinger  | Redeploy no painel da Hostinger (repo adminadopet) ou build local + upload do `dist/`. |

Depois do deploy da API, teste: `GET https://sua-api/v1/admin/feature-flags` (com token de admin) deve retornar pelo menos a flag `REQUIRE_EMAIL_VERIFICATION`.  
Depois do deploy do portal, acesse **https://admin.appadopet.com.br** e confira o menu com ícones e a página **Feature flags**.
