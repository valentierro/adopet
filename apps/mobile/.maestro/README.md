# Maestro E2E – Adopet

Fluxos E2E para login, like e abertura de chat.

## Pré-requisitos

- [Maestro CLI](https://maestro.mobile.dev/docs/installation): `curl -Ls "https://get.maestro.mobile.dev" | bash` ou `brew install maestro`
- App rodando em simulador/emulador (ex.: `npx expo run:ios`)

## Configuração

Ajuste `config.yaml` com o `appId` do seu app (Expo: valor de `expo.ios.bundleIdentifier` ou `expo.android.package`).
Defina as variáveis de ambiente para o usuário de teste ou use valores padrão no flow.

## Executar

```bash
# Na pasta apps/mobile
maestro test .maestro
```

Ou um flow específico:

```bash
maestro test .maestro/flows/01-login.yaml
```

Os flows usam `optional: true` em várias etapas para não falhar se a tela já estiver no estado esperado.
