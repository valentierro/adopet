# Deploy e builds

## API (Vercel)

A API é deployada na **Vercel** como serverless. O código em `apps/api/` é buildado e as funções ficam em `api/`.

### Variáveis no Vercel

Configure no dashboard da Vercel:
- `DATABASE_URL` — Neon ou outro Postgres
- `JWT_SECRET`
- `S3_*` — bucket para fotos
- `ADMIN_USER_IDS`
- Outras do `.env.example`

### Deploy

Geralmente via **Git**: push na branch main dispara deploy automático.

## App mobile (EAS Build)

Builds para Play Store e App Store são feitos com **EAS** (Expo Application Services).

### Pré-requisitos

1. Conta no [expo.dev](https://expo.dev)
2. `eas login`
3. Variáveis no EAS (Secrets): `EXPO_PUBLIC_API_URL`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY_IOS`, `EXPO_PUBLIC_SENTRY_DSN`

### Gerar build

```bash
# Android (AAB para Play Store)
./scripts/build-mobile-android.sh

# iOS (para App Store)
./scripts/build-mobile-ios.sh
```

Perfis em `apps/mobile/eas.json`:
- **development** — dev client
- **preview** — build interno (APK)
- **production** — store (AAB para Android, IPA para iOS)

### Versão

A versão fica em `apps/mobile/app.config.js`:
- `version` — ex: `1.1.1`
- `android.versionCode` — inteiro (ex: 52), deve aumentar a cada upload na Play Store

`apps/api/app-version.json` — `latestVersion` e `minSupportedVersion` para o modal "Atualize o app".
