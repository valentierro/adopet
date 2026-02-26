# Arquitetura do projeto

O Adopet é um **monorepo** — vários projetos em um único repositório, compartilhando código e configurações.

## Estrutura de pastas

```
adopet/
├── apps/
│   ├── api/          # Backend NestJS (API REST)
│   ├── mobile/       # App React Native (Expo)
│   └── admin-web/    # Painel administrativo (opcional)
├── packages/
│   └── shared/       # Tipos e schemas compartilhados (API + mobile)
├── assets/
│   └── brand/        # Logo, ícone, splash oficiais
├── infra/            # Docker Compose (PostgreSQL, Redis, MinIO)
├── scripts/          # Scripts de desenvolvimento
├── docs/             # Esta documentação
├── pnpm-workspace.yaml
└── package.json
```

## O que cada app faz?

| App | Tecnologia | Função |
|-----|------------|--------|
| **api** | NestJS + Prisma | Backend REST: auth, feed, pets, chat, adoções, parceiros, etc. |
| **mobile** | React Native + Expo | App para iOS e Android: feed, swipes, favoritos, chat, perfil |
| **admin-web** | React | Painel para administradores (moderação, estatísticas) |
| **shared** | TypeScript | Tipos (User, Pet, etc.) e schemas Zod usados por api e mobile |

## Monorepo com pnpm

O arquivo `pnpm-workspace.yaml` define os pacotes:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Isso permite:
- Rodar comandos em apps específicos: `pnpm --filter mobile dev`
- O mobile e a API importarem `@adopet/shared` como dependência
- Um único `pnpm install` na raiz instala tudo

## Fluxo de dados (resumido)

```
[App Mobile]  ←→  [API NestJS]  ←→  [PostgreSQL]
     ↓                   ↓
  Zustand           Prisma ORM
  React Query       S3 (fotos)
```

- **Mobile:** Zustand guarda auth (tokens, user); React Query cacheia dados da API
- **API:** Prisma acessa o banco; fotos vão para S3 (ou MinIO local)
- **Shared:** Define tipos e validações usados nos dois lados

## Principais arquivos de configuração

| Arquivo | Função |
|---------|--------|
| `package.json` (raiz) | Scripts globais (`dev`, `infra:up`), engines |
| `apps/mobile/app.config.js` | Config do Expo (versão, ícone, splash) |
| `apps/api/prisma/schema.prisma` | Modelos do banco |
| `apps/mobile/eas.json` | Perfis de build (dev, preview, production) |
| `infra/docker-compose.yml` | PostgreSQL, Redis, MinIO |
