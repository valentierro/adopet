# Adopet — API

Backend do Adopet em **NestJS** com **TypeScript**.

## Requisitos

- Node.js >= 18
- pnpm
- PostgreSQL (via Docker: `pnpm infra:up` na raiz)

## Como rodar

### 1. Subir o Postgres (na raiz do monorepo)

```bash
pnpm infra:up
```

### 2. Configurar e migrar

```bash
cp .env.example .env
# Ajuste DATABASE_URL se necessário: postgresql://adopet:adopet@localhost:5432/adopet
pnpm prisma:generate
pnpm prisma migrate dev --name init
pnpm prisma:seed
```

### 3. Iniciar a API

```bash
pnpm dev
```

- **API:** http://localhost:3000/v1  
- **Swagger:** http://localhost:3000/api/docs  
- **Health:** GET http://localhost:3000/v1/health  

## Estrutura

```
apps/api/
├── prisma/
│   ├── schema.prisma   # Modelos (User, Pet, PetMedia, Swipe, etc.)
│   ├── seed.ts         # 1 user + 10 pets com fotos
│   └── migrations/
├── src/
│   ├── prisma/         # PrismaService (global)
│   ├── health/         # GET /v1/health
│   ├── feed/            # GET /v1/feed (cursor, lat/lng/radiusKm, userId)
│   ├── pets/            # GET /v1/pets, GET /v1/pets/:id
│   ├── swipes/          # POST /v1/swipes
│   └── ...
└── package.json
```

## Banco de dados: Prisma

- **Comandos:**  
  - `pnpm prisma:generate` — gera o client  
  - `pnpm prisma migrate dev` — cria/aplica migrations  
  - `pnpm prisma:seed` ou `pnpm prisma db seed` — popula 1 user e 10 pets  
  - `pnpm prisma:studio` — abre o Prisma Studio  

Variável obrigatória: `DATABASE_URL` no `.env`.

## Admin e moderação

- **Desativar conta:** o usuário pode chamar **PUT /v1/me/deactivate** (autenticado). A conta recebe `deactivatedAt` e deixa de poder fazer login até reativar (manual no banco).
- **Verificação (admin):** defina no `.env` a variável **ADMIN_USER_IDS** com os UUIDs dos administradores separados por vírgula. Esses usuários podem:
  - **GET /v1/verification/admin/pending** — listar solicitações de verificação pendentes
  - **PUT /v1/verification/admin/:id** — body `{ "status": "APPROVED" | "REJECTED" }` para aprovar ou rejeitar
- **Denúncias:** **GET /v1/reports** — [Admin] lista todas as denúncias (requer ADMIN_USER_IDS).

## Endpoints (Fase 1)

- **GET /v1/health** — healthcheck
- **GET /v1/pets** — listar todos os pets (admin/debug)
- **GET /v1/pets/:id** — buscar pet por ID
- **GET /v1/feed** — feed ordenado por **relevância** (ver algoritmo abaixo). Query: `lat`, `lng`, `radiusKm`, `cursor`, `species`. Resposta: `{ items: Pet[], nextCursor: string | null }`. Só retorna pets **AVAILABLE**; pets já vistos (swipe), denunciados ou de usuários bloqueados não aparecem.
- **POST /v1/swipes** — body: `{ userId, petId, action: "LIKE" | "PASS" }`

---

## Algoritmo de relevância do feed (ranking “Tinder-like”)

O **GET /v1/feed** ordena os pets por um **score de relevância** (maior = mais relevante), em vez de ordem fixa por data. Assim, o feed prioriza anúncios mais próximos, recentes e com mais engajamento.

### Fatores e pesos (soma = 1)

| Fator | Peso | Descrição |
|-------|------|-----------|
| **Distância** | 40% | Quanto mais perto do usuário (lat/lng), maior o score. Fórmula: `1 / (1 + distance_km)`. |
| **Recência** | 30% | Pets publicados há pouco tempo sobem. Decay: `exp(-0.08 * dias_desde_criado)`. |
| **Engajamento** | 20% | Número de favoritos (likes) no pet. Normalizado: `min(1, log(1 + count) / 5)`. |
| **Compatibilidade** | 10% | Se a espécie do pet bate com a preferência do usuário (DOG/CAT/BOTH), recebe 1; senão 0. |

### Fórmula do score

```
score = 0.4 * (1 / (1 + dist_km))
      + 0.3 * exp(-0.08 * dias_desde_criado)
      + 0.2 * min(1, log(1 + favoritos) / 5)
      + 0.1 * compatibilidade_espécie
```

### Comportamento

- **Candidatos:** até 500 pets por request (status AVAILABLE, não swiped, não denunciados, donos não bloqueados, filtro de espécie aplicado).
- **Ordenação:** por `score` descendente; em empate, por `id` descendente.
- **Paginação:** cursor opaco (codifica `score|id` do último item). Próxima página retorna os 20 seguintes na mesma ordem.
- **Garantias:** pets com status **IN_PROCESS** ou **ADOPTED** não entram no feed; apenas **AVAILABLE**. Pets já vistos (com swipe) e denúncias/bloqueios continuam excluídos como antes.

## Redis

Opcional. Use para cache ou filas no futuro. Variável: `REDIS_URL`. Para subir com Docker: `docker compose -f infra/docker-compose.yml --profile with-redis up -d`. Uso está documentado no README da raiz.

## Storage (MinIO) — upload de fotos

Para cadastro de pets com fotos, a API usa armazenamento **S3-compatível**. Em desenvolvimento você pode usar **MinIO** via Docker.

### 1. Subir o MinIO

Na raiz do monorepo:

```bash
docker compose -f infra/docker-compose.yml --profile with-minio up -d
```

- **Console MinIO:** http://localhost:9001 (login: `minioadmin` / `minioadmin`)
- **API S3:** http://localhost:9000

### 2. Criar o bucket

1. Acesse http://localhost:9001 e faça login.
2. Crie um bucket chamado **`adopet`**.
3. (Opcional) Para acesso público às imagens: em **Bucket → Manage → Access Rules**, adicione uma regra que permita `read` para `*` no prefixo `uploads/`. Ou use a URL do console para cada objeto.

### 3. Configurar o `.env` da API

No `apps/api/.env`:

```env
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="adopet"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
# URL base dos arquivos (para montar a URL pública). Exemplo com MinIO:
S3_PUBLIC_BASE="http://localhost:9000/adopet"
```

Em produção, use **AWS S3** (ou outro S3-compatível) e defina `S3_ENDPOINT` apenas se for um endpoint customizado; `S3_PUBLIC_BASE` pode ser uma CDN ou o domínio público do bucket.

## Stripe — webhook em desenvolvimento (parceiro pago)

O checkout do Stripe abre no navegador; quando o pagamento é concluído, o Stripe envia um **webhook** (`checkout.session.completed`) para a API. Só assim o backend marca o parceiro como pago (`isPaidPartner = true`) e o app libera o Portal do parceiro.

Em **localhost** o Stripe não consegue acessar sua máquina. Use o **Stripe CLI** para encaminhar os eventos:

### 1. Instalar o Stripe CLI

- macOS: `brew install stripe/stripe-cli/stripe`
- Ou baixe em: https://stripe.com/docs/stripe-cli

### 2. Login e encaminhar webhooks

```bash
stripe login
stripe listen --forward-to localhost:3000/v1/payments/stripe-webhook
```

O CLI exibe algo como: `Ready! Your webhook signing secret is whsec_xxxxxxxx`.

### 3. Colocar o secret no `.env`

No `apps/api/.env`:

```env
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxx"
```

Use o valor que o `stripe listen` mostrou (ele muda a cada vez que você inicia o listen).

### 4. Fluxo de teste

1. Deixe o `stripe listen` rodando em um terminal.
2. API rodando (`pnpm dev`) com `STRIPE_SECRET_KEY` e `STRIPE_PRICE_BASIC` no `.env`.
3. No app: criar conta parceiro e ir para pagamento (ou Perfil → Renovar assinatura do parceiro).
4. Na tela do Stripe, use cartão de teste (ex.: `4242 4242 4242 4242`) e conclua o pagamento.
5. O CLI encaminha o evento para a API; o backend atualiza o parceiro.
6. No app, toque em **“Voltar ao comerciante”** / “Return to merchant” na página de sucesso do Stripe (ou feche e abra o app). O Perfil deve mostrar **Portal do parceiro** e o portal ficará acessível.

Sem o `stripe listen` + `STRIPE_WEBHOOK_SECRET`, o pagamento acontece no Stripe mas a API nunca recebe o evento e o portal não é liberado.
