# Sentry — passo a passo (crash reporting)

O app já está preparado para enviar erros e crashes ao **Sentry**. Basta criar a conta, o projeto e configurar o DSN. Sem o DSN, nada é enviado e o app funciona normalmente.

---

## Passo 1 — Criar conta no Sentry

1. Acesse **[sentry.io](https://sentry.io)** e clique em **Get Started** (ou **Sign up**).
2. Crie a conta com e-mail ou “Continue with Google” / GitHub.
3. Se pedir, crie uma **Organization** (ex.: `adopet` ou o nome da sua empresa). Pode usar o nome sugerido.

---

## Passo 2 — Criar o projeto no Sentry

1. No dashboard do Sentry, clique em **Create project** (ou **Projects** → **Create Project**).
2. Na lista de plataformas, escolha **React Native** (ou **Expo**, se aparecer).
3. Dê um nome ao projeto, por exemplo: **Adopet**.
4. Se perguntar sobre **Alert frequency**, pode deixar o padrão (alertas por e-mail quando houver erros).
5. Clique em **Create project**.

---

## Passo 3 — Copiar o DSN

1. Após criar o projeto, o Sentry mostra a tela **Configure your application**.
2. Procure o campo **DSN** (Data Source Name). É uma URL que começa com `https://` e contém algo como `xxx@xxx.ingest.sentry.io/xxx`.
3. Clique em **Copy** ao lado do DSN (ou selecione e copie).
   - Se não estiver nessa tela: vá em **Settings** (ícone de engrenagem) → **Projects** → **Adopet** (ou o nome do projeto) → **Client Keys (DSN)**. O **DSN** está ali; copie o valor.

Guarde esse DSN; você vai colá-lo no EAS no próximo passo.

---

## Passo 4 — Colocar o DSN no EAS (Expo)

1. Acesse **[expo.dev](https://expo.dev)** e faça login.
2. Abra o projeto **Adopet** (o app mobile).
3. No menu do projeto, vá em **Project settings** (ou **Settings**).
4. Abra a seção **Secrets** (ou **Environment variables**).
5. Clique em **Add secret** (ou **Create**).
6. Preencha:
   - **Name:** `EXPO_PUBLIC_SENTRY_DSN`
   - **Value:** cole o DSN que você copiou do Sentry (a URL completa).
   - **Environments:** marque **Production** (e **Preview** se quiser ver erros em builds de teste).
7. Salve.

Não use espaço ou aspas no valor; só a URL do DSN.

---

## Passo 5 — Novo build do app

O DSN é lido em **tempo de build**. Por isso:

1. Gere um **novo build de produção** para Android (e iOS quando for publicar):
   ```bash
   cd apps/mobile
   npx eas-cli build --platform android --profile production
   ```
2. Instale esse novo build no celular (ou publique na loja).
3. A partir daí, erros e crashes desse build serão enviados ao Sentry.

Em desenvolvimento (Expo Go ou build de desenvolvimento sem o secret), o Sentry não envia nada se o DSN não estiver definido.

---

## Passo 6 — Conferir se está funcionando

1. No Sentry, abra o projeto **Adopet**.
2. No menu lateral, vá em **Issues** (ou **Errors**).
3. Use o app em produção (ou em um build que tenha o DSN). Se ocorrer um crash ou um erro capturado pelo `AppErrorBoundary`, ele deve aparecer em **Issues** em alguns segundos.
4. **Teste opcional:** em algum lugar do app (ex.: tela de configurações ou perfil), você pode temporariamente adicionar um botão que chame `Sentry.captureException(new Error('Teste Sentry'))`. Ao tocar, um evento de teste aparece no Sentry. Depois remova o botão.

---

## O que o app envia ao Sentry

- **Crashes** e erros não tratados (graças ao `Sentry.wrap` no root e ao Error Boundary).
- **Exceções** que são capturadas pelo `AppErrorBoundary` (tela vermelha de erro no app); elas são enviadas com `Sentry.captureException`.

Nenhum dado é enviado se `EXPO_PUBLIC_SENTRY_DSN` não estiver definido no ambiente de build.

---

## Resumo rápido

| Onde            | O que fazer |
|-----------------|-------------|
| **sentry.io**   | Criar conta → Organization → Project (React Native) → copiar **DSN**. |
| **expo.dev**    | Projeto Adopet → **Secrets** → criar `EXPO_PUBLIC_SENTRY_DSN` com o valor do DSN → ambiente **Production**. |
| **Seu computador** | Rodar `eas build --platform android --profile production` (e iOS quando for o caso). |
| **Sentry**      | Em **Issues** você verá os erros dos builds que tiverem o DSN configurado. |

---

## (Opcional) Source maps e Auth Token

Para ver o **stack trace** no Sentry com nomes de arquivos e linhas do seu código (em vez de código minificado), é preciso enviar **source maps** no build. Isso exige:

1. No Sentry: **Settings** → **Auth Tokens** → criar um token com permissão **project:releases**.
2. No EAS: adicionar um secret **SENTRY_AUTH_TOKEN** com esse token.
3. No projeto: adicionar o plugin do Sentry no `app.config.js` e o Metro do Sentry no `metro.config.js` (conforme a [doc do Sentry para Expo](https://docs.sentry.io/platforms/react-native/manual-setup/expo/)).

Para começar, só o **DSN no EAS** já é suficiente para receber os erros; os source maps podem ser configurados depois.
