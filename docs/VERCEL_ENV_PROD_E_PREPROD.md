# Vercel: variáveis por ambiente (Production vs Pre-Production)

Guia para configurar na Vercel as variáveis **recomendadas** separadas entre **Production** e **Pre-Production** (Preview + Development). Assim a API em produção usa segredos e recursos de prod, e os deploys de Preview usam dev/teste.

---

## Onde configurar

**Vercel** → projeto da **API** → **Settings** → **Environment Variables**.

Para cada variável abaixo você terá **duas linhas** com o mesmo nome: uma com ambiente **Production** e outra com **Pre-Production** (ou "All Pre-Production Environments").

---

## 1. JWT_SECRET

**Por quê separar:** Tokens JWT assinados em prod não devem ser válidos em dev e vice-versa (segurança).

| Ambiente        | Ação |
|-----------------|------|
| **Production**  | Edite ou crie `JWT_SECRET`. Ambiente: só **Production**. Valor: um segredo forte **só de produção** (ex.: gere com `openssl rand -base64 32`). |
| **Pre-Production** | Crie outra variável `JWT_SECRET`. Ambiente: **Pre-Production**. Valor: **outro** segredo forte (ex.: outro `openssl rand -base64 32`). |

**Gerar um segredo (terminal):**
```bash
openssl rand -base64 32
```
Use uma saída para Production e outra (nova execução) para Pre-Production.

---

## 2. Stripe (pagamentos)

**Por quê separar:** Em produção usa chaves **Live** (cobrança real). Em Preview usa chaves **Test** (sem cobrança real).

### 2.1 STRIPE_SECRET_KEY

| Ambiente        | Valor |
|-----------------|--------|
| **Production**  | `sk_live_...` (Dashboard Stripe → Developers → API keys → **Live** → Secret key) |
| **Pre-Production** | `sk_test_...` (Dashboard Stripe → Developers → API keys → **Test** → Secret key) |

Na Vercel: duas entradas `STRIPE_SECRET_KEY`, uma com ambiente Production (valor `sk_live_...`) e outra Pre-Production (valor `sk_test_...`).

### 2.2 STRIPE_WEBHOOK_SECRET

| Ambiente        | Valor |
|-----------------|--------|
| **Production**  | Signing secret do webhook configurado em modo **Live** (ex.: `whsec_...`) |
| **Pre-Production** | Signing secret do webhook em modo **Test**, ou use a variável `STRIPE_WEBHOOK_SECRET_SANDBOX` com esse valor |

Na Vercel:
- **Production:** `STRIPE_WEBHOOK_SECRET` = secret do webhook **Live**.
- **Pre-Production:** `STRIPE_WEBHOOK_SECRET` (ou `STRIPE_WEBHOOK_SECRET_SANDBOX`) = secret do webhook **Test**.

### 2.3 STRIPE_PRICE_* (opcional)

Se você usa preços diferentes em teste (ex.: `price_xxx` de teste) e em produção, crie duas versões de cada:

- **STRIPE_PRICE_BASIC**
- **STRIPE_PRICE_DESTAQUE**
- **STRIPE_PRICE_PREMIUM**

Production = IDs dos preços **Live**; Pre-Production = IDs dos preços **Test**.

---

## 3. S3 (upload de fotos)

**Por quê separar:** Fotos enviadas em Preview não devem ir para o bucket de produção.

**Opções:**

- **Opção A (recomendada):** Ter dois buckets (ex.: `adopet-prod` e `adopet-dev`). Em Production use as variáveis S3 do bucket de prod; em Pre-Production use as do bucket de dev.
- **Opção B:** Em Pre-Production deixar S3 sem configurar (upload falha em Preview) — só se você não for testar upload em Preview.

Variáveis S3 (cada uma com duas linhas: Production e Pre-Production):

| Variável        | Production | Pre-Production |
|-----------------|------------|----------------|
| **S3_ENDPOINT** | (ex.: endpoint AWS ou MinIO prod) | Endpoint do bucket de dev (ou vazio se não usar) |
| **S3_REGION**   | (ex.: `us-east-1`) | Mesma região do bucket dev |
| **S3_BUCKET**   | Nome do bucket **prod** | Nome do bucket **dev** |
| **S3_ACCESS_KEY** | Chave do bucket prod | Chave do bucket dev |
| **S3_SECRET_KEY** | Segredo do bucket prod | Segredo do bucket dev |
| **S3_PUBLIC_BASE** | URL base pública do bucket prod (ex.: `https://bucket-prod.s3.region.amazonaws.com`) | URL base do bucket dev |

**Passos na Vercel (resumo):**

1. Para cada variável acima (S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_BASE):
   - Se já existir uma entrada “All Environments”, edite e mude para **Production** e coloque os valores de **prod**.
   - Adicione uma **nova** entrada com o **mesmo nome**, ambiente **Pre-Production**, e valores do bucket **dev** (ou vazio se não for usar S3 em Preview).

### 3.1 Passo a passo na Vercel (cada variável S3)

Para cada uma das **6 variáveis** (S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_BASE):

**A) Deixar a entrada atual só para Production**

1. Clique nos **três pontinhos (⋯)** à direita da variável → **Edit**.
2. Em **Environments**, troque de "All Environments" para **Production** (marque só Production).
3. **Value** permanece (são os dados do bucket de prod). Clique em **Save**.

**B) Criar entrada para Pre-Production**

4. **Add New** → **Environment Variable**.
5. **Name:** o mesmo (ex.: `S3_BUCKET`).
6. **Value:** valor do bucket de **dev** (nome, região, chave, URL base, etc.).
7. **Environments:** marque só **Pre-Production**. **Save**.

Repita A e B para as outras cinco variáveis. Ordem sugerida: primeiro edite as 6 para Production (A), depois crie as 6 de Pre-Production (B).

### 3.2 Se ainda não tiver bucket de dev (AWS S3)

1. **AWS Console** → **S3** → **Create bucket**. Nome: ex. `adopet-dev`. Região: mesma de prod (ex.: `sa-east-1`).
2. Configure políticas de acesso (público ou privado, conforme você faz em prod).
3. Crie um **usuário IAM** com permissão nesse bucket (`s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`). Gere **Access Key** e **Secret Key**.
4. **S3_PUBLIC_BASE** para dev: URL pública do bucket (ex.: `https://adopet-dev.s3.sa-east-1.amazonaws.com`) ou do CloudFront, se usar.
5. Em AWS S3 padrão, **S3_ENDPOINT** pode ficar vazio (a API usa o endpoint implícito da região).

Com isso, preencha as 6 variáveis de Pre-Production na Vercel.

---

## Checklist rápido

- [ ] **JWT_SECRET:** Production = segredo A, Pre-Production = segredo B (gerados com `openssl rand -base64 32`).
- [ ] **STRIPE_SECRET_KEY:** Production = `sk_live_...`, Pre-Production = `sk_test_...`.
- [ ] **STRIPE_WEBHOOK_SECRET:** Production = secret webhook Live, Pre-Production = secret webhook Test (ou SANDBOX).
- [ ] **S3_*** (todas): Production = bucket/credenciais prod, Pre-Production = bucket/credenciais dev (ou deixar vazio em Preview se não for testar upload).

Depois de salvar, faça um **Redeploy** do último deployment de Production (e, se quiser, de um Preview) para garantir que as variáveis novas/alteradas foram aplicadas.
