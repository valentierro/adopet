# Passo a passo: do zero até o app na Google Play

Este guia considera que você já usa **Vercel** para a API e **Expo** para o app. Use as fases na ordem; cada uma depende da anterior.

---

# FASE 1 — API na Vercel (produção)

Sem a API em produção, o app não funciona para usuários reais. Você já usa **Vercel** para a API.

## 1.1 URL da API na Vercel

- Depois do deploy, a API fica em uma URL como `https://seu-projeto.vercel.app` ou no domínio que você configurou (ex.: `https://api.adopet.com.br`).
- O app chama os endpoints em `https://sua-url/v1/...`. Anote a **URL base** (sem `/v1`) para usar na Fase 2 e no webhook do Stripe.

## 1.2 Variáveis de ambiente da API na Vercel

Configure as variáveis no **Vercel Dashboard**:

1. Acesse [vercel.com](https://vercel.com) → seu time/projeto da **API** (pasta `apps/api` ou o projeto que faz deploy da API).
2. **Settings** → **Environment Variables**.
3. Cadastre cada variável abaixo para o ambiente **Production** (e Preview se quiser). Não use o `.env` do seu computador para produção.

| Variável | Obrigatório | Exemplo / Observação |
|----------|-------------|----------------------|
| `PORT` | Sim | `3000` (ou o que o provedor definir) |
| `DATABASE_URL` | Sim | String de conexão **PostgreSQL** de produção (ex.: Neon, Railway DB, Supabase). Use SSL. |
| `JWT_SECRET` | Sim | String longa e aleatória (ex.: gere com `openssl rand -base64 32`). **Troque** o valor de desenvolvimento. |
| `REDIS_URL` | Não* | `redis://...` se usar Redis; pode omitir se o app não depender dele. |
| `ADMIN_USER_IDS` | Não | UUIDs dos admins separados por vírgula (quem vê "Administração" no app). |
| `S3_ENDPOINT` | Sim** | URL do S3 (Backblaze B2, AWS, etc.). Ex.: `https://s3.us-east-005.backblazeb2.com` |
| `S3_REGION` | Sim** | Ex.: `us-east-005` |
| `S3_BUCKET` | Sim** | Nome do bucket (ex.: `adopet`) |
| `S3_ACCESS_KEY` | Sim** | Chave de acesso do storage |
| `S3_SECRET_KEY` | Sim** | Chave secreta do storage |
| `S3_PUBLIC_BASE` | Sim** | URL base pública dos arquivos (ex.: `https://seu-bucket.s3.regiao.amazonaws.com`) |
| `STRIPE_SECRET_KEY` | Sim*** | Chave **live** (`sk_live_...`) para cobrança real; ou `sk_test_...` só para teste. |
| `STRIPE_WEBHOOK_SECRET` | Sim*** | Secret do webhook em produção (`whsec_...`). Veja passo 1.4. |
| `STRIPE_PRICE_BASIC` | Sim*** | Price ID do plano (ex.: `price_xxx`) |

\* Obrigatório só se a API usar Redis.  
\** Obrigatório para upload de fotos de pets.  
\*** Obrigatório para parceiros pagantes; sem isso, cadastro de parceiro funciona mas não abre o pagamento.

## 1.3 Banco de dados em produção

- Use um PostgreSQL gerenciado (Neon, Railway, Supabase, etc.).
- Crie um banco **novo** para produção (não use o de desenvolvimento).
- Rode as migrations: no seu computador, com `DATABASE_URL` apontando para esse banco:
  ```bash
  cd apps/api
  DATABASE_URL="sua-url-de-producao" npx prisma migrate deploy
  ```
- (Opcional) Rode o seed só se precisar de dados iniciais; em produção muitas vezes não.

## 1.4 Webhook do Stripe (produção)

1. No [Dashboard do Stripe](https://dashboard.stripe.com), mude para **modo Live** (canto superior direito).
2. **Developers** → **Webhooks** → **Add endpoint**.
3. **Endpoint URL:** `https://sua-api.vercel.app/v1/payments/stripe-webhook` (use a mesma URL base da sua API na Vercel).
4. Eventos a assinar: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
5. Depois de criar, copie o **Signing secret** (`whsec_...`) e cadastre na **Vercel** como variável **`STRIPE_WEBHOOK_SECRET`** (Environment Variables → Production).

## 1.5 Conferir se a API está ok

- Abra no navegador: `https://sua-url-vercel/v1/health` (ou a URL do seu projeto na Vercel). Deve retornar algo como `{"status":"ok"}`.
- Anote a **URL base da API** (sem `/v1`). Ex.: `https://adopet-api.vercel.app`. Você usa na Fase 2 e no webhook do Stripe.

---

# FASE 2 — Variáveis do app (Expo / EAS)

Você já usa **Expo**; o app só precisa saber a URL da API em produção.

## 2.1 Onde configurar

1. Acesse [expo.dev](https://expo.dev) e faça login.
2. Abra o projeto **Adopet** (o mesmo que você usa no EAS).
3. **Project settings** → **Environment variables** (ou **Secrets**).

## 2.2 Variáveis para o ambiente Production

| Nome | Valor | Observação |
|------|--------|------------|
| `EXPO_PUBLIC_API_URL` | `https://sua-api.vercel.app` | URL base da API na **Vercel**, **sem** `/v1`. Ex.: `https://adopet-api.vercel.app` |

- Marque o ambiente **Production** (e, se quiser, **Preview** para testes).
- Não coloque barra no final nem `/v1`; o app adiciona `/v1` nas requisições.

Não é obrigatório cadastrar mais nenhuma variável para o build do app; as outras (ex.: Stripe, JWT) ficam só na API.

---

# FASE 3 — Gerar o AAB (build de produção)

## 3.1 Login no EAS

No terminal, na raiz do monorepo ou em `apps/mobile`:

```bash
npx eas-cli login
```

Use o mesmo e-mail da conta em expo.dev.

## 3.2 Rodar o build

```bash
cd apps/mobile
npx eas-cli build --platform android --profile production
```

- O EAS vai perguntar se quer vincular o projeto a uma conta Expo (se ainda não estiver). Confirme.
- O build roda na nuvem. Pode levar alguns minutos.
- No fim, aparece um **link para baixar o arquivo .aab**. Baixe e guarde; você vai subir esse arquivo na Play Console.

Se algo falhar, confira:
- `EXPO_PUBLIC_API_URL` está definida para o ambiente **Production** no expo.dev.
- Você está em `apps/mobile` ao rodar o comando.

---

# FASE 4 — Google Play Console (conta e app)

## 4.1 Conta de desenvolvedor

1. Acesse [Google Play Console](https://play.google.com/console).
2. Faça login com uma conta Google.
3. Aceite os termos e pague a **taxa única** de registro (cerca de US$ 25).
4. Preencha dados do perfil (nome, país, etc.) se solicitado.

## 4.2 Criar o app

1. Na Play Console, clique em **Criar app**.
2. Preencha:
   - **Nome do app:** Adopet
   - **Idioma padrão:** Português (Brasil)
   - **Tipo:** Aplicativo ou jogo
   - **Categoria:** Estilo de vida (ou “Comunidade”, conforme achar melhor)
   - Marque que cumpre as políticas e que é responsável pelo app.

## 4.3 Política de privacidade

- O app já tem uma tela de **Política de Privacidade**. Você precisa publicar essa política em uma **URL pública** (ex.: site do Adopet ou página no GitHub Pages).
- Na Play Console, em **Política do app** / **Política de privacidade**, informe essa URL.
- Se ainda não tiver site, pode criar uma página estática com o texto da política e hospedar em qualquer lugar (Vercel, Netlify, GitHub Pages).

## 4.4 Ficha da loja (textos para a Google Play)

Use os textos abaixo na **Ficha da loja** do app (descrição curta, descrição completa, etc.).

### Nome do app (até 30 caracteres)

```
Adopet - Adoção de pets
```

### Descrição curta (até 80 caracteres)

```
Encontre seu pet ideal. Adote com responsabilidade e apoie parceiros que cuidam de animais.
```

### Descrição completa (até 4000 caracteres)

Use este bloco na “Descrição detalhada” da Play Store:

```
Adopet conecta quem quer adotar um pet com tutores e instituições que buscam um lar responsável. Tudo em um app pensado para adoção consciente.

O QUE VOCÊ ENCONTRA NO ADOPET

• Feed de pets disponíveis para adoção — cães e gatos de todo o Brasil
• Perfis completos dos animais: fotos, história, temperamento e necessidades
• Mapa para ver pets próximos a você
• Favoritos e buscas salvas para não perder aquele que combinou com você
• Conversa direta com o tutor ou instituição para combinar a adoção
• Selo de anúncio verificado para mais segurança
• Parceiros Adopet: clínicas, pet shops e ONGs com cupons e informações para você e seu novo amigo

PARA QUEM QUER COLOCAR UM PET PARA ADOÇÃO

• Anúncio simples e organizado com fotos e descrição
• Controle de adoções e conversas em um só lugar
• Opção de destaque para parceiros (clínicas, lojas e ONGs)

PARCEIROS ADOPET

Clínicas veterinárias, pet shops e ONGs podem fazer parte do Adopet: aparecer na página de parceiros, oferecer cupons de desconto e dar mais visibilidade aos pets em adoção.

Baixe o Adopet e dê o primeiro passo para uma adoção responsável. Seu novo melhor amigo pode estar a um toque de distância.
```

### O que há de novo (opcional, para a primeira versão)

```
Primeira versão do Adopet: feed de adoção, mapa, favoritos, chat com tutores, parceiros e cupons. Adote com responsabilidade.
```

## 4.5 Imagens e recursos da loja

A Play Console pede:

- **Ícone do app:** 512 x 512 px (PNG, sem transparência). Você pode usar o ícone que já está em `apps/mobile/assets/brand/icon/`.
- **Gráfico de destaque (Feature graphic):** 1024 x 500 px. Pode ser um banner com logo “Adopet” e uma frase (ex.: “Adoção responsável na palma da mão”).
- **Capturas de tela:** pelo menos 2 (recomendado 4–8). Telas do feed, perfil de um pet, mapa, lista de parceiros, etc. Use um celular ou emulador para tirar as screens.

---

# FASE 5 — Enviar o AAB e publicar

## 5.1 Preencher conteúdo do app (questionários)

Na Play Console, o app pede:

- **Classificação de conteúdo** — questionário sobre público, compras no app, etc. O Adopet tem compras (assinatura de parceiros); marque conforme as perguntas.
- **Público-alvo e faixa etária** — defina (ex.: maior de 13 anos ou conforme sua política).
- **Política de privacidade** — URL que você cadastrou.
- **Contato** — e-mail de suporte (ex.: contato@adopet.com.br).

Preencha tudo que estiver pendente na lateral do app na Play Console.

## 5.2 Criar a release de produção

1. No menu do app, abra **Produção** (ou **Teste interno** / **Teste fechado** para testar antes).
2. Clique em **Criar nova versão**.
3. Em **App bundles**, faça o **upload** do arquivo **.aab** que você baixou do EAS.
4. Em **Nome da versão**, use algo como `1.0.0 (1)`.
5. Em **Notas da versão**, pode usar o texto “O que há de novo” da seção 4.4 (versão em português).
6. Salve e avance até **Revisar e enviar** (ou **Iniciar implantação**).

## 5.3 Enviar para revisão

- Clique para enviar a versão para revisão do Google.
- A revisão costuma levar de algumas horas a alguns dias.
- Você será notificado por e-mail quando for aprovada ou se precisar de alterações.

Depois de aprovada, o app ficará disponível na Google Play (ou no track que você escolheu: produção, teste aberto, etc.).

---

# Resumo: ordem dos passos

| # | O que fazer |
|---|-------------|
| 1 | Garantir que a API está deployada na **Vercel** e acessível em HTTPS |
| 2 | Configurar **todas** as variáveis de ambiente da API no **Vercel** (Settings → Environment Variables → Production: DB, JWT, S3, Stripe) |
| 3 | Rodar `prisma migrate deploy` no banco de produção |
| 4 | Configurar webhook do Stripe em produção (URL = `https://sua-api.vercel.app/v1/payments/stripe-webhook`) e colocar `STRIPE_WEBHOOK_SECRET` na **Vercel** |
| 5 | Testar `https://sua-api.vercel.app/v1/health` |
| 6 | No **expo.dev**, cadastrar `EXPO_PUBLIC_API_URL` = URL da API na Vercel (sem `/v1`) para o ambiente **Production** |
| 7 | `cd apps/mobile` e rodar `npx eas-cli build --platform android --profile production` |
| 8 | Baixar o .aab gerado pelo EAS |
| 9 | Criar conta e app na Google Play Console; preencher política de privacidade |
| 10 | Preencher ficha da loja (nome, descrições, ícone, gráfico, screenshots) |
| 11 | Preencher questionários (classificação, público, contato) |
| 12 | Criar release de produção, fazer upload do .aab e enviar para revisão |

Quando tiver a URL da API e da política de privacidade, basta seguir a ordem acima e usar os textos sugeridos na Fase 4 para publicar o app.

---

# Checklist rápido: onde cadastrar cada variável

## Na Vercel (projeto da API) — Settings → Environment Variables → Production

| Variável | Exemplo |
|----------|---------|
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | string longa aleatória (produção) |
| `REDIS_URL` | `redis://...` (opcional) |
| `ADMIN_USER_IDS` | `uuid1,uuid2` (opcional) |
| `S3_ENDPOINT` | `https://s3.regiao.amazonaws.com` |
| `S3_REGION` | `us-east-005` |
| `S3_BUCKET` | `adopet` |
| `S3_ACCESS_KEY` | chave do storage |
| `S3_SECRET_KEY` | secreta do storage |
| `S3_PUBLIC_BASE` | `https://bucket.s3.regiao.amazonaws.com` |
| `STRIPE_SECRET_KEY` | `sk_live_...` ou `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (do webhook em produção) |
| `STRIPE_PRICE_BASIC` | `price_xxx` |

## No Expo (expo.dev → seu projeto Adopet → Environment variables → Production)

| Variável | Exemplo |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | `https://sua-api.com` (sem `/v1`) |

## No Stripe (Dashboard)

- Webhook: URL = `https://sua-api.com/v1/payments/stripe-webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copiar o **Signing secret** → colocar em `STRIPE_WEBHOOK_SECRET` na API
