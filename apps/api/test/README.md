# Testes E2E da API Adopet

Testes de ponta a ponta que sobem a aplicação Nest e fazem requisições HTTP reais.

## Pré-requisitos

- **Banco de dados:** `DATABASE_URL` no `.env` da API (ou variável de ambiente). Os testes de health não dependem do banco; auth e feed precisam de um usuário (ex.: rodar `pnpm prisma:seed` antes).
- **Usuário de teste:** o seed cria `admin@adopet.com.br` com senha `admin123`. Para outro usuário, defina `E2E_TEST_EMAIL` e `E2E_TEST_PASSWORD`.
- **Usuário parceiro (para partner-services.e2e-spec):** padrão `parceiro@adopet.com.br` / `admin123`; opcional `E2E_PARTNER_EMAIL`, `E2E_PARTNER_PASSWORD`.

## Executar

```bash
# Na pasta apps/api
pnpm test:e2e
```

Ou um arquivo específico:

```bash
pnpm test:e2e -- health.e2e-spec
```

## O que é testado

| Arquivo                | Fluxo |
|------------------------|--------|
| health.e2e-spec        | GET /v1/health |
| auth.e2e-spec          | Login (401/200), signup (201/409), refresh, logout |
| auth-partner.e2e-spec  | Cadastro de parceiro (partner-signup) |
| feed.e2e-spec          | Feed e mapa (GET /feed, GET /feed/map) |
| pets.e2e-spec          | CRUD anúncios, detalhes pet, perfil tutor (owner-profile), pets/mine, similar |
| favorites.e2e-spec     | Adicionar/listar/remover favoritos |
| swipes.e2e-spec        | Like, pass, listar passed, desfazer pass |
| chat.e2e-spec          | Conversas (criar, listar, obter), mensagens (enviar, listar) |
| adoption.e2e-spec      | me/adoptions, me/pending-adoption-confirmations, confirm-adoption |
| reports.e2e-spec       | Criar denúncia (PET) |
| blocks.e2e-spec        | Bloquear e desbloquear usuário |
| me.e2e-spec            | Me (perfil), tutor-stats, preferências (GET/PUT) |
| partner-services.e2e-spec | CRUD serviços do parceiro (me/partner/services) – usuário parceiro |
| partners-public.e2e-spec  | Listagem e detalhes de parceiros (público), serviços, cupons, view |
| saved-search.e2e-spec    | CRUD buscas salvas (me avise quando tiver pet que combine) |

## Variáveis opcionais

- **Parceiro (CRUD serviços):** `E2E_PARTNER_EMAIL` e `E2E_PARTNER_PASSWORD` (padrão: `parceiro@adopet.com.br` / `admin123`).

## CI

Em pipeline, garanta que o banco de teste está acessível (conectividade de rede e TLS/SSL corretos para o `DATABASE_URL`) e que as migrations (e opcionalmente o seed) foram aplicadas antes de rodar `pnpm test:e2e`. O `app.init()` da Nest faz `$connect` do Prisma, então todos os specs (inclusive health) exigem banco disponível.

## Neon e "bad certificate format"

Se o Neon está acessível (ex.: `psql` ou app sobe normal) mas os E2E falham com **"Error opening a TLS connection: bad certificate format"**:

1. **Rodar E2E no mesmo ambiente onde a API sobe** – no terminal da sua máquina (não em sandbox/CI), com o mesmo `.env`:
   ```bash
   cd apps/api && pnpm test:e2e -- health.e2e-spec
   ```
2. **Garantir `sslmode=require` na URL** – no `.env`, a `DATABASE_URL` do Neon deve terminar com `?sslmode=require` (senha com caracteres especiais precisa ser URL-encoded).
3. **Testar só a conexão** – na pasta `apps/api`:
   ```bash
   npx prisma db execute --stdin <<< "SELECT 1"
   ```
   Se esse comando passar, o Prisma consegue conectar; se falhar com o mesmo erro de certificado, o problema é TLS/Node/OpenSSL no ambiente, não os specs.

---

## Recomendações de cobertura (visão SDET)

Com base na superfície da API e nos fluxos já cobertos, estes são os **gaps** que valem priorizar:

### Alto valor (recomendado cobrir em seguida)

| Fluxo | Motivo | Sugestão de spec |
|-------|--------|------------------|
| **Signup usuário comum** | Auth hoje só cobre login e partner-signup; cadastro de tutor é fluxo crítico. | Estender `auth.e2e-spec`: POST /auth/signup (201 + tokens ou requiresEmailVerification), email/username duplicado (409). |
| **Refresh token e logout** | Garantir que renovação e invalidação de sessão funcionam. | Em `auth.e2e-spec`: POST /auth/refresh com refreshToken (200), POST /auth/logout (200 ou 204). |
| **Upload (presign + confirm)** | Várias features dependem de foto (pet, avatar, logo). Um E2E mínimo evita regressão na integração. | Novo `uploads.e2e-spec`: POST /uploads/presign (200, body com url e key), POST /uploads/confirm com key válida (200). Confirm-avatar/confirm-partner-logo podem ser smoke opcional. |
| **Tutor marca pet como adotado** | Core do produto: PATCH /pets/:id/publication com status ADOPTED e opcionalmente pendingAdopterId. | Em `pets.e2e-spec` ou `adoption.e2e-spec`: obter pet do usuário, PATCH status ADOPTED (e se houver, GET conversation-partners antes). |
| **Public stats** | Endpoint público usado na landing ou app. | Um caso em `health.e2e-spec` ou novo `public.e2e-spec`: GET /v1/public/stats (200 e shape esperado). |

### Valor médio

| Fluxo | Motivo |
|-------|--------|
| **Denúncias: listar/resolver (admin)** | Reports hoje só cria; fluxo completo exige usuário admin. |
| **Admin smoke** | Com token admin: GET /admin/stats, GET /admin/adoptions, GET /admin/users (200). Garante que rotas protegidas não quebram. |
| **Verificação (tutor)** | POST /verification/request, GET /verification/status – importante para confiança no perfil. |
| **Me: PUT perfil, export, deactivate** | PUT /me, GET /me/export (LGPD), PUT /me/deactivate – segurança e portabilidade. |
| **Partner: cupons** | CRUD /me/partner/coupons se o app usa; hoje só serviços estão cobertos. |

### Menor prioridade

- **Bug-reports**: POST /bug-reports (um caso rápido).
- **Partner-recommendations**: POST (um caso).
- **Lookup username**: GET /me/lookup-username/:username (usado ao indicar adotante).

Ordem sugerida para implementar: **auth (signup + refresh + logout)** → **uploads (presign/confirm)** → **marcar pet como adotado** → **public/stats** → admin smoke e denúncias admin.
