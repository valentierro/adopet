# Deploy para produção

Checklist para subir API, (opcional) landing e novo build para a Google Play.

---

## 1. API na Vercel (recomendado antes do build do app)

A API em produção é a que o app chama. Para as últimas alterações (incl. fluxo de assinatura parceiro) entrarem em produção:

1. **Commit e push** do código (branch que a Vercel usa, em geral `main`).
2. Se o projeto da API estiver **conectado ao repositório**, o deploy é automático ao dar push.
3. Se não for automático: no [Vercel Dashboard](https://vercel.com) → projeto da **API** (Root Directory = `apps/api`) → **Deployments** → **Redeploy** ou novo deploy a partir do branch.

**Conferir:** `https://sua-api.vercel.app/v1/health` deve retornar `{"status":"ok"}`.

**Variáveis de produção:** em **Settings → Environment Variables** da API na Vercel, garanta que estão definidas para **Production** (ex.: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY` live, `STRIPE_WEBHOOK_SECRET` do webhook de produção, S3, etc.). Veja `apps/api/VERCEL_DEPLOY.md` e `apps/mobile/PASSO_A_PASSO_PUBLICACAO.md` (Fase 1).

---

## 2. Landing (adopetlanding) na Vercel — só se precisar

- Se a **landing** (site institucional) está em um projeto Vercel separado e você alterou algo nela: faça deploy desse projeto (push no repositório da landing ou deploy manual).
- Se não mudou nada na landing, **não precisa** fazer deploy dela.

---

## 3. Build Android para a Google Play (EAS)

1. **(Opcional)** Aumentar a versão do app para a loja:
   - Em `apps/mobile/app.json`, em `expo.android.versionCode` (ex.: `3` → `4`) para cada nova release na Play Store.

2. **Variável de produção no Expo:**
   - Em [expo.dev](https://expo.dev) → projeto Adopet → **Project settings** → **Secrets** ou **Environment variables**.
   - Garanta `EXPO_PUBLIC_API_URL` para o ambiente **Production** com a URL base da API (ex.: `https://adopet-api.vercel.app`), **sem** `/v1` e **sem** barra no final.

3. **Gerar o AAB (build de produção):**

   ```bash
   cd apps/mobile
   npx eas-cli build --platform android --profile production
   ```

4. Ao terminar, baixe o **.aab** pelo link que o EAS mostrar e use-o na **Play Console** em **Produção** (ou teste fechado/aberto) para publicar a nova versão.

---

## Resumo

| O que              | Precisa? | Ação |
|--------------------|----------|------|
| **API (Vercel)**   | Sim      | Push no repo (deploy automático) ou redeploy manual no projeto da API. |
| **Landing (Vercel)** | Só se alterou | Deploy do projeto da landing. |
| **Build Google**   | Sim      | `cd apps/mobile && npx eas-cli build --platform android --profile production` e subir o .aab na Play Console. |

A API na Vercel e o build do app são independentes: o app já usa a URL da API que você definiu em `EXPO_PUBLIC_API_URL` (produção). Fazer o deploy da API **antes** do build garante que o app em produção aponte para o código mais recente.
