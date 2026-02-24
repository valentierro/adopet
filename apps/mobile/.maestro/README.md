# Maestro E2E – Adopet (mobile)

Fluxos E2E para login, like, abertura de chat e parceria.

## Pré-requisitos

- [Maestro CLI](https://maestro.mobile.dev/docs/installation): `curl -Ls "https://get.maestro.mobile.dev" | bash` ou `brew install maestro`
- App rodando em simulador/emulador (ex.: `npx expo run:ios` ou `pnpm ios` em `apps/mobile`)
- API acessível (para login e dados), ou use mock/backend de teste

## Configuração

Ajuste `config.yaml` com o `appId` do seu app (Expo: valor de `expo.ios.bundleIdentifier` ou `expo.android.package`).
Defina as variáveis de ambiente para o usuário de teste (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`) ou use valores padrão no flow.

## Executar

```bash
# Na pasta apps/mobile
pnpm e2e
# ou
maestro test .maestro
```

Ou um flow específico:

```bash
maestro test .maestro/flows/01-login.yaml
```

Os flows usam `optional: true` em várias etapas para não falhar se a tela já estiver no estado esperado.

---

## E2E no projeto Adopet

- **API:** testes E2E em `apps/api` (Jest + supertest). Rodar com `pnpm test:e2e` em `apps/api`; exigem `DATABASE_URL` e seed (ver `apps/api/test/README.md`).
- **Mobile:** Maestro (este diretório). Rodar com `pnpm e2e` em `apps/mobile` com o app no simulador.
