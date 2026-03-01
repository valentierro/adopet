# Contexto do Projeto Adopet — Prompt para Agente AI

Este documento fornece o contexto completo do monorepo **Adopet** para que o agente possa realizar alterações em qualquer parte do app.

**Como usar:** Cole este arquivo (ou mencione `@AGENTS.md`) no chat do Cursor antes de solicitar alterações. O agente deve ler e seguir este contexto.

---

## 1. Visão geral

**Adopet** é um app de adoção de pets no Brasil. Monorepo pnpm com:
- **apps/api** — Backend NestJS (REST, Prisma, PostgreSQL)
- **apps/mobile** — App React Native (Expo)
- **packages/shared** — Tipos, schemas Zod e utils compartilhados

**Stack:** Node 18+, pnpm 9, React 19, NestJS 10, Prisma 5, Expo 54.

---

## 2. Estrutura do monorepo

```
adopet/
├── apps/
│   ├── api/              # NestJS + Prisma
│   │   ├── prisma/       # schema.prisma, migrations, seed.ts
│   │   ├── src/          # módulos NestJS
│   │   ├── api/          # handler Vercel (serverless)
│   │   └── test/         # e2e (supertest)
│   ├── mobile/           # Expo + React Native
│   │   ├── app/          # Expo Router (file-based routing)
│   │   ├── src/          # components, stores, api, hooks
│   │   └── eas.json      # perfis de build (dev, preview, production)
│   └── admin-web/        # Painel admin (opcional)
├── packages/shared/      # @adopet/shared
├── infra/                # docker-compose (PostgreSQL, Redis, MinIO)
├── scripts/              # setup, migrate, dev, build
└── docs/                 # Documentação (GitHub Pages)
```

---

## 3. API (apps/api)

### Organização

Cada recurso é um **módulo NestJS** com:
- `*.controller.ts` — endpoints REST
- `*.service.ts` — lógica de negócio
- `dto/*.dto.ts` — validação com `class-validator`

### Módulos principais

| Módulo | Rota base | Responsabilidade |
|--------|-----------|------------------|
| auth | /v1/auth | Login, signup, refresh, forgot/change password |
| feed | /v1/feed | Feed paginado, mapa (pins) |
| pets | /v1/pets | CRUD pets, adoções, match score |
| swipes | /v1/swipes | Curtir, passar, desfazer pass |
| favorites | /v1/favorites | Favoritos |
| conversations | /v1/conversations | Conversas e mensagens |
| me | /v1/me | Perfil, preferências, KYC, parceiro |
| admin | /v1/admin | Painel admin |
| moderation | /v1/reports, /v1/blocks | Denúncias, bloqueios |
| uploads | /v1/uploads | Presign S3 |
| health | /v1/health | Healthcheck |

### Padrões da API

- Prefixo global: `/v1`
- Autenticação: JWT Bearer (`JwtAuthGuard`, `OptionalJwtAuthGuard`)
- DTOs com `class-validator` e `@ApiProperty` (Swagger)
- Prisma: `PrismaService` injetado nos services
- Swagger: `api/docs` e `api/docs-json`

### Arquivos-chave

- `src/app.module.ts` — módulo raiz
- `src/app-bootstrap.ts` — criação do app (main.ts e Vercel)
- `prisma/schema.prisma` — modelos do banco

---

## 4. Mobile (apps/mobile)

### Navegação (Expo Router)

Rotas em `app/` (file-based):
- `(tabs)/` — abas principais (feed, map, chats, profile, etc.)
- `(auth)/` — login, signup, forgot-password
- `(onboarding)/` — onboarding
- `pet/[id]`, `chat/[id]` — rotas dinâmicas

### Estado e dados

- **Zustand:** `authStore` em `src/stores/authStore.ts` (tokens, user, logout)
- **React Query:** cache de API; persiste em AsyncStorage (`ADOPET_QUERY_CACHE`)
- **API client:** `src/api/client.ts` — base URL `EXPO_PUBLIC_API_URL/v1`, header Authorization, refresh em 401

### Estrutura src/

```
src/
├── api/           # funções de chamada (auth, feed, pets, etc.)
├── components/    # UI (PetCard, PrimaryButton, etc.)
├── hooks/         # useTheme, useAppVersionCheck, etc.
├── stores/        # authStore
├── storage/       # tokens (SecureStore), onboarding
├── theme/         # cores, radius
└── utils/         # helpers
```

### Configuração

- `app.config.js` — versão, ícone, splash
- `eas.json` — perfis de build
- `.env` — `EXPO_PUBLIC_API_URL` (obrigatório)

---

## 5. Banco de dados (Prisma)

### Modelos principais

- **User** — auth, perfil, KYC, preferências
- **Pet** — anúncio (species, age, city, fotos, status: AVAILABLE | IN_PROCESS | ADOPTED)
- **Swipe** — like/pass do usuário no pet
- **Favorite** — favoritos
- **Conversation**, **Message** — chat
- **Adoption** — adoção confirmada (tutor + adotante + pet)
- **Report**, **Block** — moderação
- **Partner** — parceiros (ONG, comercial)

### Migrations

```bash
./scripts/migrate.sh           # aplicar
./scripts/migrate-new.sh "x"   # criar nova
./scripts/seed.sh              # seed
```

---

## 6. Shared (packages/shared)

Exporta: `types`, `schemas` (Zod), `utils/validation`. Usado por api e mobile. Após alterar, rodar `pnpm --filter @adopet/shared build`.

---

## 7. Scripts e comandos

| Comando | Descrição |
|---------|-----------|
| `./setup.sh` | Setup completo (ou `--cloud` sem Docker) |
| `./scripts/dev-api.sh` | Sobe API |
| `./scripts/dev-mobile.sh` | Sobe Expo |
| `./scripts/migrate.sh` | Aplica migrations |
| `./scripts/seed.sh` | Seed do banco |
| `./scripts/bump-version.sh <ver> <code>` | **Obrigatório antes do build:** atualiza version, buildNumber e versionCode em todos os arquivos. Ex: `./scripts/bump-version.sh 1.1.6 60` |
| `./scripts/build-mobile-android.sh` | Build Android (EAS) |
| `./scripts/build-mobile-ios.sh` | Build iOS (EAS) |
| `pnpm dev` | API + mobile em paralelo |
| `pnpm test` | Testes (api + mobile) |
| `pnpm --filter api test` | Testes da API |
| `pnpm --filter api test:e2e` | E2E da API |

---

## 8. Testes

### API

- **Unitários:** `*.spec.ts` com Jest (ex: `auth.service.spec.ts`)
- **E2E:** `test/*.e2e-spec.ts` com supertest
- Rodar: `cd apps/api && pnpm test` ou `pnpm test:e2e`

### Mobile

- **Unitários:** `*.spec.ts`, `*.spec.tsx`
- Rodar: `pnpm --filter mobile test`

---

## 9. Convenções de código

- **TypeScript** em todo o projeto
- **Prettier** para formatação (`pnpm format`)
- **API:** injeção de dependência NestJS; services sem lógica HTTP direta
- **Mobile:** componentes funcionais; hooks para lógica reutilizável
- **Nomenclatura:** camelCase (código), kebab-case (arquivos quando fizer sentido)

---

## 10. Variáveis de ambiente

- **API:** `DATABASE_URL`, `JWT_SECRET`, `S3_*`, etc. (ver `apps/api/.env.example`)
- **Mobile:** `EXPO_PUBLIC_*` (expostas ao app; `EXPO_PUBLIC_API_URL` obrigatória)

---

## 11. Documentação

- `docs/` — documentação completa (getting-started, architecture, api-reference, etc.)
- Swagger: `http://localhost:3000/api/docs` ou `docs/swagger/index.html`

---

## Instruções para o agente

Ao realizar alterações:

1. **Identifique o escopo:** API, mobile ou shared.
2. **Siga os padrões existentes:** mesma estrutura de pastas, nomes e convenções.
3. **API:** adicione DTOs com validação e decoradores Swagger quando criar endpoints.
4. **Mobile:** use `useAuthStore`, `api` client e React Query; evite estados locais quando o dado vem da API.
5. **Shared:** altere tipos/schemas em `packages/shared` e rode `pnpm --filter @adopet/shared build` antes de usar.
6. **Migrations:** ao alterar `schema.prisma`, crie migration com `./scripts/migrate-new.sh "descricao"`.
7. **Testes:** adicione ou atualize testes ao mudar lógica crítica.
8. **Build:** verifique que `pnpm build` e os scripts de build mobile funcionam após mudanças estruturais.
9. **Versão (build para loja):** sempre use `./scripts/bump-version.sh <versão> <versionCode>`. Atualiza `app.config.js`, `package.json` e `app-version.json`. O versionCode deve ser único e crescente por upload (Play Store/App Store).
