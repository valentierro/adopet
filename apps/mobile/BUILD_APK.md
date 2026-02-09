# Gerar APK para testadores

Este guia explica como gerar um APK do app Adopet para distribuir a testadores.

## Importante sobre a Vercel

A **Vercel** é ótima para hospedar o **front-end web** ou APIs serverless. O **build do APK** é feito pelo **EAS (Expo Application Services)** na nuvem da Expo — não pela Vercel. Depois de gerar o APK, você pode:

- Compartilhar o link de download que o EAS gera, ou  
- Fazer o download do APK e hospedar em qualquer lugar (inclusive um projeto estático na Vercel só para servir o arquivo `.apk`).

---

## Pré-requisitos

1. **Conta Expo** (gratuita): [expo.dev](https://expo.dev) → Sign up  
2. **API em produção**: o app usa a variável `EXPO_PUBLIC_API_URL`. Para testadores usarem o app de verdade, a API precisa estar no ar (ex.: Vercel, Railway, Render, etc.). Se a API do projeto for NestJS, você pode deployar na Vercel (como serverless) ou em outro serviço.

---

## Passo a passo

### 1. EAS CLI (sem instalação global)

Use **npx** para rodar o EAS sem configurar instalação global do pnpm/npm:

```bash
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

Se preferir instalar globalmente com **npm** (evita problemas de `pnpm global`):

```bash
npm install -g eas-cli
eas login
```

### 2. Fazer login na Expo

```bash
npx eas-cli login
# ou, se instalou globalmente: eas login
```

Use o mesmo e-mail da conta em [expo.dev](https://expo.dev).

### 3. Configurar a URL da API no EAS (para o APK usar sua API)

O app chama a API em `EXPO_PUBLIC_API_URL`. Defina essa variável no projeto EAS para o build do APK já sair apontando para sua API:

1. Acesse [expo.dev](https://expo.dev) → seu projeto **Adopet** (será criado no primeiro build).  
2. **Project settings** → **Environment variables** (ou **Secrets**).  
3. Crie a variável:
   - **Name:** `EXPO_PUBLIC_API_URL`  
   - **Value:** `https://sua-api.com` (URL base da API, **sem** `/v1` no final; o app adiciona `/v1`).  
   - **Environment:** marque pelo menos **Preview** (e Production se for usar).

Exemplo: se sua API está em `https://adopet-api.vercel.app`, use:

```text
EXPO_PUBLIC_API_URL=https://adopet-api.vercel.app
```

### 4. Gerar o APK

No monorepo, entre na pasta do app e rode o build para Android no perfil **preview** (já configurado para gerar APK):

```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

- O EAS vai pedir para vincular o projeto a uma conta Expo (se ainda não estiver).  
- O build roda na nuvem. Ao terminar, aparece um **link para baixar o APK**.

### 5. Distribuir para testadores

- **Opção A:** Envie o **link de download** que o EAS mostra no fim do build. Quem for testar abre no celular (ou no PC e depois transfere o APK) e instala.  
- **Opção B:** Baixe o APK no seu computador e coloque em um site (por exemplo um deploy estático na Vercel) e compartilhe o link do arquivo.

Testadores precisam permitir “Instalar de fontes desconhecidas” (ou “Instalar apps desconhecidos”) nas configurações do Android para instalar um APK que não veio da Play Store.

---

## Resumo dos comandos

```bash
# 1. Login Expo (uma vez) — use npx para não precisar instalar global
npx eas-cli login

# 2. Definir EXPO_PUBLIC_API_URL no painel expo.dev (Preview)

# 3. Gerar o APK
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

Depois disso, use o link do APK ou hospede o arquivo onde preferir (incluindo na Vercel, se quiser só servir o arquivo para download).
