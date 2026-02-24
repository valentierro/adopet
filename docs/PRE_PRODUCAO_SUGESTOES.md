# Sugestões antes de publicar em produção

Checklist e melhorias para deixar o Adopet mais robusto e aumentar as chances de sucesso no lançamento.

---

## Já bem coberto no projeto

- **Error boundary** no app (telas de erro com “Reportar bug” e Sentry)
- **Health check** (`GET /v1/health`) para monitorar a API
- **Sentry** no mobile (builds que não são Expo Go) para crashes
- **CORS** configurado para o admin
- **E-mail de boas-vindas** ao parceiro pago com expectativas claras e apresentação do portal
- **Documentação** de deploy (DEPLOY_PRODUCTION.md, VERCEL_DEPLOY.md, etc.)

---

## 1. Confiabilidade (robustez)

### 1.1 Rate limiting na API (recomendado)

Evita abuso e DDoS em endpoints públicos (login, cadastro, recuperação de senha, feed).

- **Sugestão:** usar `@nestjs/throttler` ou um middleware que limite por IP (ex.: 100 req/min por IP em rotas públicas, 300 em rotas autenticadas).
- **Onde:** aplicado globalmente ou por módulo em `app-bootstrap.ts` / `app.module.ts`.

### 1.2 Timeouts e retry no app

- **Cliente HTTP:** garantir timeout (ex.: 15–30 s) e, se já não existir, retry apenas para erros de rede (não para 4xx/5xx arbitrários).
- **React Query:** você já usa `staleTime`; em produção pode manter `retry: 1` ou `2` para não insistir demais em API instável.

### 1.3 Variáveis de ambiente obrigatórias na subida da API

- **Sugestão:** na inicialização (ex.: `main.ts` ou um módulo de config), validar presença de `DATABASE_URL`, `JWT_SECRET`, e, se for cobrar, `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`. Se faltar algo crítico, falhar na subida com mensagem clara em vez de quebrar no primeiro request.

### 1.4 Sanidade do banco na subida

- Já existe health que provavelmente testa a conexão; garantir que o health check realmente faça um `SELECT 1` (ou equivalente) no banco para a Vercel/orquestrador marcar o deploy como saudável.

---

## 2. Segurança

### 2.1 Headers de segurança (API)

- **Helmet** (ou equivalente no Nest): `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` (se tudo for HTTPS). Reduz riscos de XSS/clickjacking e reforça uso de HTTPS.

### 2.2 Não expor stack em produção

- No handler da Vercel (`api/index.ts`), em produção **não** incluir `stack` no JSON de erro (ou enviar só para um logger). Manter `message` genérico para o cliente.

### 2.3 Secrets e build

- Confirmar que **nenhum** `.env` com segredos entra no repositório ou no bundle do app. EAS usa Secrets; API usa variáveis do ambiente da Vercel/servidor.

---

## 3. Observabilidade e operação

### 3.1 Logs estruturados na API

- Em produção, preferir logs em JSON (ex.: `{ level, message, requestId, path, userId }`) para facilitar busca em Vercel Logs ou em um agregador (Datadog, Logtail, etc.).
- Reduzir `console.log` genéricos em favor de um logger que respeite nível (ex.: em prod só `warn` e `error`).

### 3.2 Alertas básicos

- **Uptime:** usar um serviço (Uptime Robot, Better Stack, etc.) para chamar `GET https://sua-api.com/v1/health` a cada 5 min e alertar se falhar.
- **Sentry:** configurar alertas por e-mail/Slack quando houver pico de erros ou um erro novo recorrente.

### 3.3 Versão da API no health (opcional)

- Incluir no payload de `/v1/health` algo como `version: process.env.npm_package_version` ou `COMMIT_SHA` para saber qual deploy está no ar quando algo der errado.

---

## 4. UX e retenção

### 4.1 Deep links / links universais

- Garantir que links como `https://appadopet.com.br/pet/123` ou `adopet://pet/123` abram o app (e a tela do pet) quando instalado, e a landing quando não estiver. Ajuda em compartilhamento e campanhas.

### 4.2 Mensagens offline

- Em telas críticas (feed, conversas, perfil), já existe ou pode existir um banner “Sem conexão” e botão “Tentar de novo” após refetch, para o usuário não ficar sem feedback.

### 4.3 Atualização forçada (versão mínima)

- O app já tem `UpdateAvailableModal`; em produção, definir uma versão mínima na API ou no EAS e, se o app for antigo, mostrar um modal que leve à loja (evita usuários presos em versões quebradas).

---

## 5. Crescimento e métricas

### 5.1 Analytics

- Se ainda não estiver em produção, definir 3–5 eventos principais (ex.: “signup”, “pet_viewed”, “favorite_added”, “conversation_started”, “adoption_confirmed”) e enviar para o analytics que você usar (ex.: o que já está em `trackEvent`). Isso permite medir funil e impacto de mudanças.

### 5.2 Primeira experiência (onboarding)

- Revisar o fluxo do novo usuário (cadastro → primeiro acesso ao feed, “Últimas adoções”, favoritos). Um pequeno tour ou tooltip na primeira vez (“Deslize para ver mais pets”) pode aumentar engajamento.

---

## 6. Lojas (Play Store / App Store)

### 6.1 Textos e assets

- **Título e descrição** em PT-BR, destacando adoção responsável, voluntária e sem compra e venda de animais.
- **Screenshots** em várias resoluções (telefone e, se aplicável, tablet), mostrando feed, mapa, perfil e portal do parceiro.
- **Política de privacidade:** URL estável e acessível; o app já cita; usar a mesma URL nas lojas.

### 6.2 Classificação e conteúdo

- Responder questionários da Play Console / App Store com coerência: o app é sobre adoção, não venda de animais; parceiros são clínicas/lojas/ONGs com ofertas para tutores.

---

## 7. Checklist final antes do primeiro release

- [ ] API em produção com HTTPS; `EXPO_PUBLIC_API_URL` no EAS apontando para ela.
- [ ] Variáveis de produção da API preenchidas (DB, JWT, Stripe live, storage, etc.).
- [ ] Webhook Stripe em modo **live** apontando para `https://sua-api.com/v1/payments/stripe-webhook`.
- [ ] Health check respondendo 200; um monitor de uptime configurado.
- [ ] Sentry (ou similar) com alertas ativos para o app mobile.
- [ ] Nenhum segredo em repositório ou no bundle do app.
- [ ] Política de privacidade e termos acessíveis; URLs nas lojas corretas.
- [ ] Versão e versionCode/android buildNumber atualizados para o release.
- [ ] Teste completo: cadastro, login, feed, favoritos, conversa, fluxo de adoção e, se aplicável, parceiro pago (pagamento + e-mail de boas-vindas).

---

## Implementado

- **1.1 Rate limiting:** `@nestjs/throttler` configurado globalmente (100 req/min por IP). Health e webhook Stripe com `@SkipThrottle()`. Quem ultrapassar recebe **429 Too Many Requests**.
- **2.2 Stack em produção:** No handler da Vercel (`api/index.ts`), o campo `stack` do erro só é incluído na resposta quando `NODE_ENV !== 'production'`.
- **1.3 Validação de env na subida:** Em `src/env-validation.ts`, a API valida `DATABASE_URL` e `JWT_SECRET` ao carregar; se faltar alguma, falha na subida com mensagem clara.
- **2.1 Helmet:** Headers de segurança (X-Content-Type-Options, X-Frame-Options, etc.) aplicados via `helmet` no `app-bootstrap.ts`. CSP desligado por padrão para não quebrar Swagger.
- **3.3 Versão no health:** `GET /v1/health` retorna o campo `version` lido de `APP_VERSION` (env); se não definido, usa `1.0.0`. Em produção, defina `APP_VERSION` na Vercel (ex.: versão do package ou commit) para saber qual deploy está no ar.
- **1.2 Timeouts e retry no cliente HTTP:** Em `apps/mobile/src/api/client.ts`, timeout de 20 s mantido; retry apenas para erros de rede (até 2 tentativas, delay 500 ms). Não há retry para 4xx/5xx.
- **1.4 Health check testando o banco:** `GET /v1/health` executa `SELECT 1` no banco via Prisma. Se o banco estiver inacessível, retorna **503** com payload `{ status: 'error', database: 'unreachable', ... }`.
- **3.1 Logs estruturados:** Logger customizado em `src/logger/structured-logger.ts`. Em produção: saída JSON por linha (level, message, timestamp) apenas para `warn` e `error`; em dev, saída legível em todos os níveis. Nest usa esse logger; `console.warn`/`console.error` em produção são redirecionados para ele, então logs existentes (admin, payments, pets, etc.) saem em JSON na Vercel.
- **3.2 Sentry na API:** Integração com `@sentry/nestjs`. Definir `SENTRY_DSN` na Vercel (e em dev, se quiser testar) para enviar erros não tratados e exceções capturadas pelo `SentryGlobalFilter`. Erros do handler serverless (FUNCTION_INVOCATION_FAILED) também são enviados. Sem DSN, o Sentry não envia nada. Tracing com `tracesSampleRate: 0.2` em produção.
- **4.1 Deep links / links universais:** Scheme `adopet://` já existia; adicionado suporte a links universais. No app: `associatedDomains: ['applinks:appadopet.com.br']` (iOS) e `intentFilters` para `https://appadopet.com.br/pet` (Android). Na landing: `public/.well-known/apple-app-site-association` e `public/.well-known/assetlinks.json` com placeholders. **Só Android por enquanto:** preencher apenas o **SHA256 fingerprint** em `assetlinks.json` e publicar a landing; links `https://appadopet.com.br/pet/123` abrem o app no Android. Para iOS depois, preencher **TEAMID** no AASA; ver `apps/landing/public/.well-known/README.md`.
- **4.2 Mensagens offline:** Banner global "Sem conexão. Verifique sua internet." via `OfflineBanner` + `AppWithOfflineBanner` (NetInfo). Feed, mapa, perfil, pet, conversas e outras telas já têm `RefreshControl` e/ou estado de erro com botão "Tentar de novo" / "Tentar novamente". No feed foi adicionado estado de erro explícito quando a carga inicial falha: mensagem e botão "Tentar de novo".
- **4.3 Atualização forçada (versão mínima):** O app já tem `UpdateAvailableModal` e `useAppVersionCheck`, que consultam `GET /v1/health/app-config` (`latestVersion`, `minSupportedVersion`). Em produção, definir `APP_MIN_SUPPORTED_VERSION` (e `APP_LATEST_VERSION`) na API ou via `app-version.json` (atualizado pelo GitHub Action em tags). Versão abaixo do mínimo exige atualização; versão abaixo da última mostra aviso opcional.
- **5.1 Analytics (eventos de funil):** Em `src/analytics.ts` estão definidos e sendo enviados os eventos: `signup_complete`, `pet_viewed` (tela do pet), `like` + `favorite_added` (swipe like e botão favoritar na tela do pet), `open_chat` (conversation_started), `adoption_confirmed` (confirmação na conversa e em "Confirmar adoção"). Em dev apenas logam no console; para produção, conectar `trackEvent` ao seu backend de analytics ou serviço (ex.: API própria, Mixpanel, Amplitude).
- **5.2 Primeira experiência (onboarding no feed):** No modo swipe do feed, tooltip de primeira vez: "Deslize para ver mais pets" com setas e botão "Entendi". Só aparece uma vez por usuário (ou visitante); após o primeiro swipe ou ao tocar em "Entendi", fica salvo em AsyncStorage e não volta a aparecer.
- **3.2 Alertas (uptime + Sentry):** Guia em **docs/ALERTAS_UPTIME_E_SENTRY.md**: como configurar monitor de uptime (Uptime Robot ou Better Stack) em `GET /v1/health` a cada 5 min e notificações; como configurar alertas no Sentry (novo issue, pico de erros) com e-mail e Slack. Basta seguir o guia nos painéis de cada serviço.

Prioridade sugerida para as próximas melhorias: itens de **lojas** (6.1 textos/assets, 6.2 classificação) e **checklist final** (7) antes do primeiro release. O restante pode ser feito nos primeiros sprints pós-lançamento conforme tempo e necessidade.
