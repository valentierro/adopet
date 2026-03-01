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

Com o Metro rodando, você pode abrir o app de várias formas:

| Modo | Tecla | Descrição |
|------|-------|-----------|
| **Web** | `w` | App no navegador (emulador web) — ideal para testes rápidos sem emulador |
| **Android** | `a` | Emulador Android — requer [Android Studio](https://developer.android.com/studio) com um AVD criado |
| **iOS** | `i` | Simulador iOS — requer Xcode (apenas Mac) |
| **Expo Go** | — | Escaneie o **QR code** com o app [Expo Go](https://expo.dev/go) no celular (mesma rede Wi‑Fi) |

**Abrir direto na web (sem abrir o Metro interativo):**
```bash
cd apps/mobile && npx expo start --web
```

**Dicas:**
- **Expo Go:** instale no celular e escaneie o QR code; `EXPO_PUBLIC_API_URL` no `.env` deve apontar para uma URL acessível (ex.: IP da máquina ou API em nuvem).
- **Emulador Android:** abra o Android Studio → Device Manager → crie/inicie um AVD antes de pressionar `a`.

### Tudo junto

```bash
pnpm dev
```

---

## Emulador / simulador

| Plataforma | Comando | Requisito |
|------------|---------|-----------|
| Web | tecla `w` ou `npx expo start --web` | Nenhum — roda no navegador |
| iOS | `./scripts/mobile-ios.sh` ou tecla `i` | Xcode instalado |
| Android | `./scripts/mobile-android.sh` ou tecla `a` | Android Studio + emulador (AVD) |
| Expo Go | Escanear QR code no app Expo Go | Celular e mesma rede Wi‑Fi |

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
| `./scripts/dev-mobile.sh` | Sobe o app (Expo); use `w` para web, `a` para Android, `i` para iOS |
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

## Troubleshooting

Problemas comuns e como resolver.

### Setup e dependências

| Problema | Solução |
|----------|---------|
| Erro de permissão no cache do pnpm | `export COREPACK_HOME="$(pwd)/.cache/corepack"` e `./scripts/pnpm-with-cache.sh install` |
| `pnpm` não encontrado | `corepack enable` (Node 18+ inclui Corepack) |
| Shared não compila | `pnpm --filter @adopet/shared build` antes de rodar API ou mobile |

### API

| Problema | Solução |
|----------|---------|
| "Can't reach database server" | Suba o Postgres: `./scripts/infra-up.sh`. Se usar Neon, verifique a `DATABASE_URL` e liberação de IP. |
| API não inicia (porta em uso) | Verifique se outra instância está rodando; altere `PORT` no `.env` se necessário. |
| Migrations falham | `./scripts/migrate.sh` — se o banco estiver vazio, rode `./scripts/seed.sh` depois. |

### Mobile (Expo)

| Problema | Solução |
|----------|---------|
| "Unable to connect" no Expo Go | Celular e PC na **mesma rede Wi‑Fi**. Use o IP da máquina no `.env`: `EXPO_PUBLIC_API_URL=http://SEU_IP:3000`. Teste no navegador do celular: `http://SEU_IP:3000/v1/health`. |
| Firewall bloqueando | Libere a porta 3000 para a rede local (Mac: Preferências do Sistema → Segurança → Firewall → Opções). |
| "getDevServer is not a function" | `cd apps/mobile && node scripts/patch-expo-router-getDevServer.js && pnpm reset-cache` |
| App trava ou dá crash no iOS | `cd apps/mobile && pnpm reset-cache`, depois `pnpm dev` e pressione `i`. Se persistir: [IOS_EMULATOR.md](apps/mobile/IOS_EMULATOR.md). |
| Alterou `.env` e não refletiu | Pare o Metro (Ctrl+C) e rode `pnpm dev:mobile` de novo — variáveis `EXPO_PUBLIC_*` são carregadas na inicialização. |
| Emulador Android não abre | Crie um AVD no Android Studio (Device Manager). Inicie o emulador antes de pressionar `a`. |
| Metro / bundler com cache antigo | `cd apps/mobile && npx expo start --clear` ou `pnpm reset-cache` |

### Build (EAS)

| Problema | Solução |
|----------|---------|
| Build falha no EAS | Verifique variáveis: `eas secret:list`. Confirme `EXPO_PUBLIC_API_URL`, `GOOGLE_MAPS_API_KEY` (Android) e `GOOGLE_MAPS_API_KEY_IOS` (iOS). Logs em [expo.dev](https://expo.dev). |

**Documentação detalhada:**
- [Manutenção e troubleshooting](docs/maintenance.md)
- [Setup Expo Go no celular](apps/mobile/SETUP_EXPO_GO.md)
- [Simulador iOS](apps/mobile/IOS_EMULATOR.md)
- [Deploy na Vercel](apps/api/VERCEL_DEPLOY.md)

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
