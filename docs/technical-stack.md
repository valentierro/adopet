# Stack de desenvolvimento

Stack completa do Adopet com versões.

## Raiz (monorepo)

| Pacote | Versão |
|--------|--------|
| Node.js | >= 18 |
| pnpm | 9.0.0 |
| Prettier | ^3.2.5 |
| React (override) | 19.1.0 |
| React DOM (override) | 19.1.0 |

## API (apps/api)

| Pacote | Versão |
|--------|--------|
| NestJS (common, core, platform-express) | ^10.4.0 |
| NestJS Config | ^3.2.0 |
| NestJS JWT | ^11.0.2 |
| NestJS Passport | ^11.0.5 |
| Prisma | ^5.18.0 |
| Prisma Client | ^5.18.0 |
| TypeScript | ^5.5.0 |
| class-validator | ^0.14.1 |
| class-transformer | ^0.5.1 |
| bcrypt | ^6.0.0 |
| express | ^4.21.0 |
| nodemailer | ^8.0.1 |
| stripe | ^20.3.1 |
| @aws-sdk/client-s3 | ^3.985.0 |
| helmet | ^8.0.0 |
| compression | ^1.8.1 |
| Jest | ^30.2.0 |
| ts-jest | ^29.4.6 |
| supertest | ^7.0.0 |

## Mobile (apps/mobile)

| Pacote | Versão |
|--------|--------|
| React | 19.1.0 |
| React Native | 0.81.5 |
| Expo | ~54.0.0 |
| Expo Router | ~6.0.23 |
| Zustand | ^5.0.0 |
| @tanstack/react-query | ^5.59.0 |
| @tanstack/query-async-storage-persister | ^5.59.0 |
| @react-navigation/native | ^7.1.28 |
| @react-navigation/bottom-tabs | ^7.12.0 |
| @react-navigation/native-stack | ^7.12.0 |
| expo-secure-store | ^15.0.8 |
| expo-image-picker | ^17.0.10 |
| expo-location | ~19.0.8 |
| react-native-maps | 1.20.1 |
| @shopify/flash-list | ^2.0.2 |
| zod | ^3.23.8 |
| TypeScript | ~5.9.3 |
| Jest | ^29.7.0 |

## Shared (packages/shared)

| Pacote | Versão |
|--------|--------|
| TypeScript | ^5.5.0 |
| zod | ^3.23.8 |

## Infraestrutura

| Componente | Versão / Tecnologia |
|------------|---------------------|
| PostgreSQL | 16-alpine (Docker) |
| Redis | 7-alpine (Docker, opcional) |
| MinIO | latest (Docker, opcional) |
| Banco produção | Neon ou similar (PostgreSQL) |
| Storage de fotos | S3 (AWS ou MinIO) |
| Deploy API | Vercel (serverless) |
| Build mobile | EAS (Expo) |
