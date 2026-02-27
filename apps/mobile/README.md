# Adopet — Mobile

App mobile do Adopet em **React Native** com **Expo** e **TypeScript**.

## Requisitos

- Node.js >= 18
- pnpm
- Expo Go (celular) ou Xcode/Android Studio (simuladores)

## Como rodar

### Setup rápido (na raiz do monorepo)

```bash
./setup.sh --cloud     # ou ./setup.sh se usar Docker
./scripts/dev-mobile.sh
```

### Apontar para a API

Configure `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/v1
```

- **Simulador iOS:** localhost funciona
- **Celular físico:** use o IP da sua máquina na mesma rede (ex.: `http://192.168.1.10:3000/v1`)
- **API na Vercel:** use a URL pública da API

### Subir o app

Na raiz do monorepo:

```bash
pnpm dev:mobile
# ou: ./scripts/dev-mobile.sh
```

Dentro de `apps/mobile`:

```bash
pnpm dev
```

### Emulador / simulador

Com o Metro rodando:
- **`i`** → iOS Simulator (requer Xcode)
- **`a`** → Android Emulator (requer Android Studio)
- Ou: `./scripts/mobile-ios.sh` / `./scripts/mobile-android.sh`

**Recomendado:** use o simulador — no Expo Go (celular) pode ocorrer "getDevServer is not a function".

### Builds (EAS)

Na raiz do monorepo:

```bash
./scripts/build-mobile-android.sh   # AAB para Play Store
./scripts/build-mobile-ios.sh       # Para App Store
```

Requer `eas login`, variáveis no EAS e contas nas lojas. Ver `apps/mobile/eas.json` para perfis.

### Erro "getDevServer is not a function (it is Object)" (Expo Go no celular)

O projeto aplica um **patch automático** no `expo-router` (script `postinstall`) para que o app funcione no Expo Go (SDK 54), onde o React Native pode exportar um objeto em vez de função. Se após `pnpm install` o erro voltar, rode na pasta `apps/mobile`:

```bash
node scripts/patch-expo-router-getDevServer.js
```

Alternativa: use o **simulador** (tecla **`i`** no terminal com Metro rodando, ou `pnpm ios`).

## Estrutura

```
apps/mobile/
├── app/                    # Rotas (Expo Router)
│   ├── _layout.tsx         # Root layout (Query, Stack)
│   ├── (tabs)/             # Bottom tabs
│   │   ├── index.tsx       # Feed
│   │   ├── favorites.tsx
│   │   ├── add-pet.tsx
│   │   ├── chats.tsx
│   │   └── profile.tsx
│   ├── pet/[id].tsx        # Detalhes do pet
│   ├── chat/[id].tsx       # Sala de conversa
│   └── preferences.tsx
├── src/
│   ├── api/                # client (fetch), feed, swipes, pet; favorites/chats ainda mock
│   ├── components/        # Componentes base
│   ├── hooks/
│   ├── mocks/              # Dados fake (pets)
│   └── theme/              # Cores, spacing, radius
├── app.json
└── package.json
```

## Tema

- **Cores:** primary `#2ECC71`, primaryDark `#1E9E5A`, accent `#FF6F61`, background, surface, textPrimary, textSecondary
- **Radius:** sm 6, md 10, lg 16
- **Spacing:** xs 4, sm 8, md 16, lg 24, xl 32

Suporte a **light** e **dark** mode via `useColorScheme()`.

## Branding

- **Ícone e splash:** em `app.json` apontam para `./assets/brand/icon/` e `./assets/brand/splash/` (cópia dos assets oficiais do repositório em `assets/brand/`). O splash dark (`splash_dark.png`) está em `assets/brand/splash/`; para usar no dark mode no futuro, configurar no `app.config.js`.
- **Observação:** Se algum asset não estiver no tamanho ideal (ex.: ícone 1024x1024 para App Store), não recriar o arte; redimensionar com ferramenta externa e substituir o arquivo, ou documentar o passo a passo no README.

## Dependências principais

- **expo** + **expo-router** (rotas e entry)
- **@react-navigation/native**, **bottom-tabs**, **native-stack**
- **@tanstack/react-query** (dados e cache)
- **zustand** (estado global, se necessário)
- **zod** (validação; tipos vindos de `@adopet/shared`)

Tipos compartilhados (Pet, User, etc.) vêm do pacote `@adopet/shared` do monorepo.
