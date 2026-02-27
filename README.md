# Adopet

Monorepo do **Adopet** — app de adoção de pets no Brasil.

## Estrutura

```
adopet/
├── apps/
│   ├── mobile/     # App React Native (Expo)
│   ├── api/        # API NestJS
│   └── admin-web/  # Painel admin (opcional)
├── packages/
│   └── shared/     # Tipos, schemas Zod e utils compartilhados
├── assets/brand/   # Logo, ícone, splash
├── infra/          # Docker Compose (PostgreSQL, Redis, MinIO)
├── scripts/        # Scripts de setup e operações
└── package.json
```

## Requisitos

- **Node.js** >= 18
- **pnpm** >= 9 (Corepack: `corepack enable`)
- **Docker** e **Docker Compose** (opcional: use `--cloud` com Neon/Vercel)

---

## Setup

### Automático (recomendado)

**Mac/Linux:**
```bash
./setup.sh              # Com Docker (PostgreSQL local)
./setup.sh --cloud      # Sem Docker (Neon, API na Vercel)
```

**Windows:**
```powershell
.\setup.ps1             # Com Docker
.\setup.ps1 -Cloud      # Sem Docker
```

O setup instala dependências, sobe o PostgreSQL (se local), aplica migrations e executa o seed. No modo `--cloud`, apenas instala deps e cria os `.env` — configure depois com suas credenciais.

### Manual

```bash
pnpm install
pnpm --filter @adopet/shared build
./scripts/env-setup.sh
# Se usar Docker:
./scripts/infra-up.sh
./scripts/migrate.sh
./scripts/seed.sh
```

### Cache do pnpm

Se houver erro de permissão no cache:
```bash
export COREPACK_HOME="$(pwd)/.cache/corepack"
./scripts/pnpm-with-cache.sh install
```

---

## Rodando o projeto

### Backend (API)

```bash
./scripts/dev-api.sh
# ou: pnpm dev:api
```

- **API:** http://localhost:3000/v1
- **Swagger:** http://localhost:3000/api/docs
- **Health:** http://localhost:3000/v1/health

### Mobile (Expo)

```bash
./scripts/dev-mobile.sh
# ou: pnpm dev:mobile
```

Com o Metro rodando:
- **`i`** — abre no simulador iOS
- **`a`** — abre no emulador Android
- **QR code** — Expo Go no celular (mesma rede)

### Tudo junto

```bash
pnpm dev
```

---

## Emulador / simulador

| Plataforma | Comando | Requisito |
|------------|---------|-----------|
| iOS | `./scripts/mobile-ios.sh` ou tecla `i` | Xcode instalado |
| Android | `./scripts/mobile-android.sh` ou tecla `a` | Android Studio + emulador |

---

## Migrations (Prisma)

| Ação | Comando |
|------|---------|
| Aplicar migrations existentes | `./scripts/migrate.sh` |
| Criar nova migration | `./scripts/migrate-new.sh "nome_da_migration"` |
| Seed do banco | `./scripts/seed.sh` |
| Prisma Studio | `cd apps/api && pnpm prisma:studio` |

---

## Infraestrutura (Docker)

| Ação | Comando |
|------|---------|
| Subir PostgreSQL | `./scripts/infra-up.sh` |
| Parar containers | `./scripts/infra-down.sh` |
| Com Redis | `docker compose -f infra/docker-compose.yml --profile with-redis up -d` |
| Com MinIO (S3 local) | `docker compose -f infra/docker-compose.yml --profile with-minio up -d` |

---

## Builds do app mobile (EAS)

Gerar builds para as lojas:

```bash
# Android (AAB para Play Store)
./scripts/build-mobile-android.sh

# iOS (para App Store)
./scripts/build-mobile-ios.sh
```

**Requisitos:**
- `eas build` configurado (login: `eas login`)
- Variáveis no EAS: `EXPO_PUBLIC_API_URL`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY_IOS`, `EXPO_PUBLIC_SENTRY_DSN`
- Conta Apple (iOS) e Google Play (Android)

Perfis em `apps/mobile/eas.json`: `development`, `preview`, `production`.

---

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `./setup.sh` | Setup completo (ou `--cloud`) |
| `./scripts/env-setup.sh` | Cria .env a partir dos .example |
| `./scripts/infra-up.sh` | Sobe PostgreSQL (Docker) |
| `./scripts/infra-down.sh` | Para containers |
| `./scripts/migrate.sh` | Aplica migrations |
| `./scripts/migrate-new.sh "nome"` | Cria nova migration |
| `./scripts/seed.sh` | Executa seed do banco |
| `./scripts/dev-api.sh` | Sobe a API |
| `./scripts/dev-mobile.sh` | Sobe o app (Expo) |
| `./scripts/mobile-ios.sh` | Abre no simulador iOS |
| `./scripts/mobile-android.sh` | Abre no emulador Android |
| `./scripts/build-mobile-android.sh` | Build Android (EAS) |
| `./scripts/build-mobile-ios.sh` | Build iOS (EAS) |
| `./scripts/test.sh` | Roda todos os testes |
| `./scripts/test-api.sh` | Roda testes da API |

### Scripts pnpm (raiz)

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | API + mobile em paralelo |
| `pnpm dev:api` | Apenas API |
| `pnpm dev:mobile` | Apenas mobile |
| `pnpm lint` | Lint em todos os pacotes |
| `pnpm format` | Formata com Prettier |
| `pnpm test` | Testes |
| `pnpm infra:up` | Docker up |
| `pnpm infra:down` | Docker down |

---

## Configuração (.env)

- **api:** `apps/api/.env` — `DATABASE_URL`, `JWT_SECRET`, `S3_*`, etc. (ver `apps/api/.env.example`)
- **mobile:** `apps/mobile/.env` — `EXPO_PUBLIC_API_URL` (URL da API)

---

## Documentação

**Documentação completa** (setup, arquitetura, API, fluxos, manutenção):  
→ [docs/README.md](docs/README.md) — pode ser publicada no GitHub Pages

**Prompt para AI/Agente:** [AGENTS.md](AGENTS.md) — contexto completo do projeto para o Cursor ou outro agente; mencione `@AGENTS.md` ao solicitar alterações.

- [Fluxo de adoção](docs/ADOPTION_FLOW.md)
- [Mobile (Expo)](apps/mobile/README.md)
- [API (NestJS)](apps/api/README.md)

---

## Branding

Assets em `assets/brand/`: logo, ícone, splash. Não alterar visualmente.
