# Painel Administrativo – Adopet

Portal web para administradores do Adopet: anúncios pendentes, verificações, denúncias, adoções, parceiros, usuários e export CSV.

## Stack

- React 18, Vite, TypeScript
- React Router, TanStack Query, React Hook Form + Zod
- Tailwind CSS (mesma identidade visual da landing e do app)

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Crie um `.env` na raiz do app (ou use variáveis no shell):

```env
VITE_API_URL=https://sua-api.com/v1
```

Se não definir `VITE_API_URL`, o app usa `http://localhost:3000/v1`.

## Build para produção

```bash
pnpm run build
```

A saída fica em `dist/`: `index.html`, `assets/`, `logo.png` e `.htaccess` (SPA para Apache/Hostinger).

## Deploy na Hostinger

1. **Subdomínio**  
   Crie o subdomínio do painel (ex.: `admin.appadopet.com.br` ou `painel.appadopet.com.br`) no painel da Hostinger.

2. **Build local**  
   No monorepo:
   ```bash
   cd apps/admin-web && pnpm run build
   ```

3. **Upload**  
   Envie **todo o conteúdo** da pasta `dist/` para a raiz do subdomínio (pasta pública do subdomínio na Hostinger), mantendo:
   - `index.html` na raiz
   - Pasta `assets/` com os JS e CSS
   - `logo.png` na raiz
   - `.htaccess` na raiz (necessário para o SPA: todas as rotas caem no `index.html`)

4. **API**  
   O front chama a API via `VITE_API_URL`. No build de produção, use:
   ```bash
   VITE_API_URL=https://api.appadopet.com.br/v1 pnpm run build
   ```
   (ou configure no pipeline de CI/CD)

5. **CORS**  
   Garanta que a API permita origem do subdomínio do admin (ex.: `https://admin.appadopet.com.br`).

## Repositório só do painel (opcional)

Se quiser um repositório separado só para subir na Hostinger:

1. Crie um repo (ex.: `adopet-admin-web`).
2. Copie para o novo repo:
   - conteúdo de `apps/admin-web/` (package.json, vite.config.ts, src, public, etc.);
   - ou apenas a pasta `dist/` após o build, com um `index.html` estático e um script de deploy que rode `pnpm build` e faça upload do `dist/`.

Para “subir na hospedagem” sem CI/CD: após `pnpm run build`, envie o conteúdo de `dist/` por FTP/gerenciador de arquivos da Hostinger para a pasta pública do subdomínio.
