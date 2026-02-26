# Suite de testes

Como rodar e verificar os testes do Adopet.

## Visão geral

| Pacote | Framework | Tipo | Arquivos |
|--------|-----------|------|----------|
| **API** | Jest | Unitários | `*.spec.ts` |
| **Mobile** | Jest | Unitários | `*.spec.ts`, `*.spec.tsx` |
| **Mobile** | Maestro | E2E | `.maestro/flows/*.yaml` |

## API — testes unitários

### Rodar todos os testes

```bash
# Na raiz
pnpm --filter api test

# Ou dentro de apps/api
cd apps/api && pnpm test
```

### Rodar um arquivo específico

```bash
cd apps/api
pnpm test feed.service.spec
pnpm test auth.service.spec
```

### Rodar com coverage

```bash
cd apps/api
pnpm test -- --coverage
```

O relatório fica em `apps/api/coverage/`.

### Arquivos de teste (API)

| Arquivo | O que testa |
|---------|-------------|
| `auth/auth.service.spec.ts` | Login, signup, refresh, checkEmail, checkDocument |
| `auth/auth.controller.spec.ts` | Endpoints do controller |
| `auth/dto/auth-dto.transform.spec.ts` | Transformação de DTOs |
| `feed/feed.service.spec.ts` | Feed, mapa, filtros, combinações |
| `pets/pets.service.spec.ts` | CRUD de pets |
| `swipes/swipes.service.spec.ts` | Curtir, passar |
| `favorites/favorites.service.spec.ts` | Favoritos |
| `conversations/conversations.service.spec.ts` | Conversas |
| `messages/messages.service.spec.ts` | Mensagens |
| `me/me.service.spec.ts` | Perfil, preferências |
| `me/tutor-stats.service.spec.ts` | Estatísticas do tutor |
| `match-engine/match-engine.service.spec.ts` | Match engine |
| `match-engine/compute-match-score.spec.ts` | Cálculo do score de match |
| `verification/verification.service.spec.ts` | KYC |
| `moderation/reports.service.spec.ts` | Denúncias |
| `moderation/blocks.service.spec.ts` | Bloqueios |
| `admin/admin.service.spec.ts` | Admin |
| `partners/partners.service.spec.ts` | Parceiros |
| `partnership-requests/partnership-requests.service.spec.ts` | Solicitações de parceria |
| `notifications/notifications-jobs.service.spec.ts` | Jobs de notificação |
| `adoption-flow.spec.ts` | Fluxo de adoção (integração) |

### Verificar resultado

- **Sucesso:** `Test Suites: N passed, N total` e `Tests: N passed, N total`
- **Falha:** Jest exibe o arquivo, o teste que falhou e a mensagem de erro (diff, stack trace)

## API — testes E2E

```bash
cd apps/api
pnpm test:e2e
```

Os testes E2E usam `supertest` e rodam contra a aplicação NestJS. Requerem banco configurado (ex.: `DATABASE_URL` no `.env`).

Para salvar log:
```bash
pnpm test:e2e:log
```

## Mobile — testes unitários

```bash
# Na raiz
pnpm --filter mobile test

# Ou dentro de apps/mobile
cd apps/mobile && pnpm test
```

### Arquivos de teste (Mobile)

| Arquivo | O que testa |
|---------|-------------|
| `utils/signupError.spec.ts` | Tratamento de erros de signup |

O mobile tem menos testes unitários; a maior parte da lógica está na API.

## Mobile — testes E2E (Maestro)

Maestro é um framework de E2E para apps mobile.

### Pré-requisitos

- App rodando no simulador/emulador ou dispositivo
- Maestro instalado: https://maestro.mobile.dev/docs/getting-started/installation

### Rodar flows

```bash
cd apps/mobile
pnpm e2e
# ou
maestro test .maestro
```

### Flows disponíveis

| Flow | Arquivo | Descrição |
|------|---------|-----------|
| Login | `flows/01-login.yaml` | Fluxo de login |
| Like/Swipe | `flows/02-like-swipe.yaml` | Curtir pet no feed |
| Abrir chat | `flows/03-open-chat.yaml` | Abrir conversa |
| Parceria | `flows/04-parceria-welcome-to-form.yaml` | Navegar até formulário de parceria |

### Configuração

`apps/mobile/.maestro/config.yaml` — configurações do Maestro (ex.: appId, env).

## Scripts de teste

| Script | Descrição |
|--------|-----------|
| `./scripts/test.sh` | Roda todos os testes do monorepo |
| `./scripts/test-api.sh` | Roda apenas os testes da API |
| `./scripts/test-api.sh feed.service` | Roda um arquivo específico da API |

## Rodar todos os testes do monorepo

```bash
# Na raiz
pnpm test
# ou
./scripts/test.sh
```

Isso executa `pnpm -r run test`, ou seja, roda os testes de todos os pacotes (api, mobile, shared). O `shared` tem `"test": "echo \"No tests yet\""`, então não roda testes de fato.

## Troubleshooting

### API: "Cannot find module"

- Rode `pnpm install` na raiz
- Rode `pnpm --filter @adopet/shared build`
- Em `apps/api`: `pnpm exec prisma generate`

### API: timeout em testes

- Alguns testes mockam o Prisma e podem ser lentos. Aumente o timeout no Jest se necessário.
- E2E: certifique-se de que o banco está acessível (`DATABASE_URL`).

### Mobile: testes não encontram módulos

- Verifique `modulePathIgnorePatterns` no `jest.config.js` (ex.: ignora `app/`)
