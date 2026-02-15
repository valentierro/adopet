# Deploy do portal admin – passo a passo

O **build já foi gerado** com a API de produção (`VITE_API_URL=https://api.appadopet.com.br/v1`).  
Pasta: `apps/admin-web/dist/`

---

## Opção 1 – Hostinger faz build pelo Git (recomendado)

1. Acesse o **painel da Hostinger** e abra o **Node.js Web App** do admin (admin.appadopet.com.br).
2. Vá em **Deploy** / **Git** / **Deployments**.
3. Clique em **Redeploy** ou **Deploy now** para rodar um novo build a partir do último commit do repo **adminadopet**.
4. Confira se a variável de ambiente do build está definida:
   - **VITE_API_URL** = `https://api.appadopet.com.br/v1`
   Se não estiver, adicione em **Settings** / **Environment variables** do app e faça um novo deploy.
5. Quando o deploy terminar, acesse **https://admin.appadopet.com.br** e teste o login.

---

## Opção 2 – Upload manual do `dist/`

Use esta opção se a Hostinger **não** estiver conectada ao Git ou se quiser subir o build que já está pronto.

1. No seu computador, a pasta pronta é:
   ```
   adopet/apps/admin-web/dist/
   ```
2. Envie **todo o conteúdo** dessa pasta para a **pasta pública** do subdomínio do admin na Hostinger (por **FTP** ou **Gerenciador de arquivos**), mantendo a estrutura:
   - **Na raiz do site do admin:**
     - `index.html`
     - `logo.png`
     - `.htaccess`
   - **Pasta `assets/`:**
     - `index-BPkpWGWB.js` (ou o nome que estiver no seu dist)
     - `index-B1iQBvRb.css` (ou o nome que estiver no seu dist)
3. Não envie a pasta `dist` em si; envie o que está **dentro** de `dist/` para a raiz do site.
4. Acesse **https://admin.appadopet.com.br** e teste o login.

---

## Conferir depois do deploy

- Abrir **https://admin.appadopet.com.br**
- Fazer login com um usuário admin
- Ver o dashboard com ícones nos cards
- Abrir **Feature flags** no menu e ver a flag de verificação de e-mail

Se a API estiver em produção e o CORS permitir `https://admin.appadopet.com.br`, o portal deve funcionar normalmente.
