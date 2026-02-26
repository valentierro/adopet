# Backend (API)

A API do Adopet é feita em **NestJS** e usa **Prisma** para acessar o PostgreSQL.

## Como rodar

```bash
# Na raiz do projeto
./scripts/dev-api.sh
# ou
pnpm dev:api
```

A API sobe em http://localhost:3000. Os endpoints ficam em `/v1`.

## URLs úteis

| URL | Descrição |
|-----|-----------|
| http://localhost:3000/v1/health | Healthcheck |
| http://localhost:3000/api/docs | Swagger embutido (documentação interativa) |
| http://localhost:3000/api/docs-json | Spec OpenAPI em JSON |
| docs/swagger/index.html | Swagger standalone (Try it out, sem precisar da API) |

Para gerar o spec estático: `pnpm openapi:fetch` (com a API rodando).

## Estrutura da API

```
apps/api/
├── prisma/
│   ├── schema.prisma    # Modelos do banco
│   ├── migrations/      # Histórico de migrations
│   └── seed.ts          # Dados iniciais (admin-teste, pets)
├── src/
│   ├── auth/            # Login, signup, refresh, logout
│   ├── feed/            # Feed e mapa
│   ├── pets/            # CRUD de pets, adoções
│   ├── swipes/          # Curtir / passar
│   ├── favorites/       # Favoritos
│   ├── conversations/   # Conversas
│   ├── messages/        # Mensagens do chat
│   ├── me/              # Perfil, preferências, KYC, parceiro
│   ├── admin/           # Painel admin
│   ├── partners/        # Parceiros públicos
│   ├── uploads/         # Presign S3
│   └── ...
├── api/                 # Handler Vercel (serverless)
└── package.json
```

## Banco de dados

A API usa **PostgreSQL**. Em desenvolvimento:

- **Com Docker:** `./scripts/infra-up.sh` sobe o Postgres
- **Com Neon:** configure `DATABASE_URL` no `.env` com a connection string do Neon

### Migrations

```bash
# Aplicar migrations existentes
./scripts/migrate.sh

# Criar nova migration (depois de mudar o schema)
./scripts/migrate-new.sh "nome_da_mudanca"
```

### Seed

O seed cria um usuário admin de teste e pets de exemplo:

```bash
./scripts/seed.sh
```

Usuário: `admin-teste@adopet.com.br` (senha no seed ou documentação interna)

## Variáveis de ambiente (.env)

As principais variáveis em `apps/api/.env`:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| DATABASE_URL | Sim | Connection string do PostgreSQL |
| JWT_SECRET | Sim | Chave para tokens JWT |
| S3_* | Para fotos | Bucket S3 (ou MinIO) para uploads |
| ADMIN_USER_IDS | Opcional | UUIDs dos admins (separados por vírgula) |
| REDIS_URL | Opcional | Redis para cache/filas |
| STRIPE_* | Para parceiros | Chaves do Stripe |

Veja `apps/api/.env.example` para a lista completa.
