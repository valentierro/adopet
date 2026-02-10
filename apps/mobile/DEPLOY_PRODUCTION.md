# Publicar o Adopet na Google Play (produção)

Este guia lista o que mudar e os passos para colocar o app em produção e publicar no Google Play.

---

## 1. API em produção

O app consome a API via `EXPO_PUBLIC_API_URL`. Antes de publicar:

- [ ] **Deploy da API** em um servidor acessível na internet (Railway, Render, Fly.io, VPS, etc.).
- [ ] **HTTPS** na URL da API (ex.: `https://api.adopet.com.br`).
- [ ] **Variáveis de produção** no servidor da API:
  - `DATABASE_URL` (banco de produção)
  - `JWT_SECRET` (segredo forte e único)
  - `STRIPE_SECRET_KEY` (chave **live** `sk_live_...` se for cobrar de verdade)
  - `STRIPE_WEBHOOK_SECRET` (webhook da conta Stripe em produção; endpoint público)
  - `STRIPE_PRICE_BASIC` (Price ID do plano em produção)
  - S3/Storage para fotos (Backblaze B2, AWS S3, etc.)
  - `ADMIN_USER_IDS` (opcional)
- [ ] **Webhook Stripe em produção:** no Dashboard Stripe (modo live), adicione o endpoint `https://sua-api.com/v1/payments/stripe-webhook` e use o signing secret no `STRIPE_WEBHOOK_SECRET`.

---

## 2. Configuração do app para produção

### 2.1 Variáveis de ambiente no EAS

No [Expo Dashboard](https://expo.dev) → seu projeto **Adopet** → **Project settings** → **Environment variables** (ou **Secrets**):

| Nome | Valor | Ambiente |
|------|--------|----------|
| `EXPO_PUBLIC_API_URL` | `https://sua-api.com` (sem `/v1`) | **Production** (e Preview se quiser testar) |

O app concatena `/v1` internamente.

### 2.2 Versão e versionCode

- **`app.json`** → `expo.version`: ex. `"1.0.0"` (versão que o usuário vê).
- **`app.json`** → `expo.android.versionCode`: número inteiro que **precisa subir a cada release** na Play Store (ex.: 1, 2, 3…). Já existe como `1`; na próxima publicação aumente para `2`.

---

## 3. Gerar o AAB (Android App Bundle) para a Play Store

O Google Play exige **AAB**, não APK, para publicação. O perfil **production** no `eas.json` já está configurado com `"buildType": "app-bundle"`.

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build --platform android --profile production
```

- O build roda na nuvem (EAS). Ao terminar, você recebe um **link para baixar o `.aab`**.
- Confirme que em **Environment variables** do EAS a variável **Production** está com `EXPO_PUBLIC_API_URL` apontando para sua API de produção.

---

## 4. Conta no Google Play

- [ ] **Conta de desenvolvedor:** [Google Play Console](https://play.google.com/console) — taxa única (cerca de US$ 25).
- [ ] **Criar o app** na Play Console (nome, idioma, tipo de app, etc.).
- [ ] **Política de privacidade:** URL pública (o app já tem tela de Política; use a mesma URL na Play Console).
- [ ] **Conteúdo do app:** classificação etária, questionário de conteúdo, dados de segurança, etc., conforme solicitado pela Play Console.

---

## 5. Enviar o AAB para a Google Play

### Opção A: Upload manual (primeira vez)

1. Na Play Console → seu app → **Produção** (ou **Teste interno/aberto**).
2. **Criar nova versão** → fazer upload do arquivo **.aab** que o EAS gerou.
3. Preencher as informações da release e enviar para revisão.

### Opção B: Envio automático com EAS Submit

1. **Service Account no Google Play:**
   - Play Console → **Configurações** → **Acesso à API** → vincular projeto do Google Cloud (se ainda não tiver).
   - Criar uma **conta de serviço** com permissão para “Release to production” (ou teste).
   - Fazer o download do JSON da chave e salvar como `apps/mobile/google-service-account.json` (e **não** commitar no Git; adicione ao `.gitignore`).

2. **Enviar o último build:**
   ```bash
   cd apps/mobile
   npx eas-cli submit --platform android --profile production --latest
   ```
   Ou fazer build e envio em sequência:
   ```bash
   npx eas-cli build --platform android --profile production --auto-submit
   ```

---

## 6. Resumo do que mudar para produção

| Onde | O que |
|------|--------|
| **API (servidor)** | Deploy em HTTPS; `.env` de produção (DB, JWT, Stripe **live**, webhook, S3). |
| **Stripe** | Modo live; webhook apontando para `https://sua-api.com/v1/payments/stripe-webhook`; `STRIPE_WEBHOOK_SECRET` no servidor. |
| **Expo (EAS)** | `EXPO_PUBLIC_API_URL` em **Production** = URL da API em produção. |
| **app.json** | A cada nova release: aumentar `version` (ex. 1.0.1) e `android.versionCode` (ex. 2). |
| **Google Play** | Conta dev; criar app; política de privacidade; upload do AAB (manual ou EAS Submit). |

---

## 7. Comandos úteis

```bash
# Login na Expo (uma vez)
npx eas-cli login

# Build de produção (AAB para Play Store)
cd apps/mobile
npx eas-cli build --platform android --profile production

# Enviar último build para a Play Store (com google-service-account.json configurado)
npx eas-cli submit --platform android --profile production --latest
```

Para **testar** um build antes de publicar (APK para instalar direto), use o perfil **preview** (veja `BUILD_APK.md`).
