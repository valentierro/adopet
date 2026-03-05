# Rodar o app local com Expo Go apontando para dev

Para desenvolver no celular (Expo Go) usando os `.env` locais e o **backend de dev** (base Neon dev, S3 adopet-dev, JWT/Stripe de teste).

---

## 1. API local usando credenciais de dev (.env.development)

A API carrega **`.env`** e depois **`.env.development`** (ou `.env.production` se `NODE_ENV=production`). O arquivo do ambiente sobrescreve o `.env`. Assim você mantém dev e prod separados sem alterar um único `.env`.

**Crie `apps/api/.env.development`** com os valores de **dev** (mesmos da Vercel Pre-Production):

- **DATABASE_URL** — connection string da base **Neon dev**
- **JWT_SECRET** — segredo de dev (Pre-Production)
- **S3_*** — bucket **adopet-dev** (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_BASE, S3_REGION)
- **STRIPE_SECRET_KEY** — `sk_test_...`
- **STRIPE_WEBHOOK_SECRET** — signing secret do webhook **Test**
- As demais (CORS_ORIGINS, ADMIN_USER_IDS, SMTP, etc.) podem ficar no `.env` ou repetir no `.env.development`.

Use **`apps/api/.env.development.example`** como modelo (copie para `.env.development` e preencha). O `.env.development` não vai para o Git (está no .gitignore).

**Opcional:** para testar localmente contra **produção** (cuidado), crie `.env.production` a partir de `.env.production.example` e rode a API com `NODE_ENV=production` (ex.: `NODE_ENV=production pnpm dev:api`).

---

## 2. Mobile apontando para a API local

**Configure `apps/mobile/.env`**:

- **EXPO_PUBLIC_API_URL** — URL da API rodando no seu computador:
  - **Celular físico (Expo Go):** use o IP da sua máquina na rede Wi‑Fi, ex.: `http://192.168.1.3:3000`
  - **Emulador:** `http://localhost:3000` (Android) ou `http://localhost:3000` (iOS)
- Descobrir o IP (Mac/Linux): `ipconfig getifaddr en0` ou `hostname -I`

Exemplo para celular na mesma Wi‑Fi:

```
EXPO_PUBLIC_API_URL=http://192.168.1.3:3000
```

Salve o arquivo. Se o Metro já estiver rodando, **reinicie** (`Ctrl+C` e `pnpm dev:mobile` de novo), pois as variáveis `EXPO_PUBLIC_*` são carregadas na inicialização.

---

## 3. Subir a API e o app

**Terminal 1 — API:**

```bash
cd /caminho/adopet
./scripts/dev-api.sh
```

Ou: `pnpm dev:api`. Aguarde aparecer que a API está escutando na porta 3000.

**Terminal 2 — Mobile (Expo):**

```bash
cd /caminho/adopet
./scripts/dev-mobile.sh
```

Ou: `pnpm dev:mobile`. Abra o **Expo Go** no celular, escaneie o QR code (ou use `i`/`a` para emulador).

---

## 4. Conferir

- Celular e computador na **mesma rede Wi‑Fi**.
- **EXPO_PUBLIC_API_URL** no `.env` do mobile com o **IP correto** (não `localhost` no celular físico).
- API no ar (health: `http://SEU_IP:3000/v1/health` deve retornar `{"status":"ok"}`).

Se der erro de conexão, confira firewall e se o IP do `.env` é o da interface Wi‑Fi (`en0`).

---

## Resumo

| Arquivo              | Deve ter (dev) |
|----------------------|----------------|
| **apps/api/.env**    | DATABASE_URL dev, S3 adopet-dev, JWT dev, Stripe test |
| **apps/mobile/.env** | EXPO_PUBLIC_API_URL=http://SEU_IP:3000 (ou localhost no emulador) |

Depois: Terminal 1 = `./scripts/dev-api.sh`, Terminal 2 = `./scripts/dev-mobile.sh`, abrir Expo Go e escanear o QR code.
