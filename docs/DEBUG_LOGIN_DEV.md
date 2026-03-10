# Login falha no app interno (dev): "O servidor respondeu com erro"

Quando o app de teste interno (build com API de dev) mostra essa mensagem ao fazer login, a **API de dev na Vercel** está respondendo com uma **página de erro em HTML** (502/503/500) em vez de JSON. Segue como conferir e corrigir.

---

## 1. Testar se a API de dev está no ar

No navegador ou no terminal:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://adopet-api-git-development-erick-santos-projects-33a225f0.vercel.app/v1/health"
```

- **200** → API está respondendo. Siga para o passo 2.
- **502 / 503 / 500** ou timeout → a função da Vercel está falhando (veja passo 3).

Se retornar 200, teste o body:

```bash
curl -s "https://adopet-api-git-development-erick-santos-projects-33a225f0.vercel.app/v1/health"
```

Deve ser algo como `{"status":"ok"}`. Se vier HTML, o deploy está quebrado.

---

## 2. Testar o login direto na API

Descubra o e-mail do admin no banco (ex.: `admin-teste@adopet.com.br`) e teste:

```bash
curl -s -X POST "https://adopet-api-git-development-erick-santos-projects-33a225f0.vercel.app/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-teste@adopet.com.br","password":"admin123"}'
```

- Se retornar **JSON** com `accessToken` → login está ok na API; o problema pode ser CORS ou URL no app.
- Se retornar **HTML** ou **5xx** → a rota de login está falhando (veja passo 3).

---

## 3. Variáveis de ambiente na Vercel (Pre-Production)

O deploy do branch **development** usa o ambiente **Pre-Production** (Preview). Todas as variáveis necessárias precisam estar definidas para esse ambiente:

1. [Vercel](https://vercel.com) → projeto da API → **Settings** → **Environment Variables**.
2. Para cada variável, confira se existe uma linha com ambiente **Preview** (ou **Pre-Production**).

Variáveis críticas para o login funcionar:

| Variável        | Uso |
|-----------------|-----|
| **DATABASE_URL** | Connection string do banco Neon **de dev**. Sem isso a API cai ao acessar o banco. |
| **JWT_SECRET**   | Usado para assinar o token no login. Deve ser o mesmo segredo de dev (não o de produção). |

Se **DATABASE_URL** ou **JWT_SECRET** estiverem só em **Production**, o deploy de Preview não as vê e a API pode retornar 502/500 (página de erro em HTML).

Depois de alterar variáveis, faça um **Redeploy** do último deployment do branch `development`.

---

## 4. Ver o erro real nos logs da Vercel

1. Vercel → projeto da API → **Deployments**.
2. Abra o deployment do branch **development** (último).
3. Aba **Functions** ou **Logs** (Runtime Logs).
4. Tente fazer login de novo no app e veja se aparece exceção (ex.: `DATABASE_URL is not set`, `Connection refused`, `JWT_SECRET undefined`).

---

## 5. Usuário existe no banco de dev?

O app de dev aponta para a API de dev, que usa o **banco Neon de dev**. O usuário com que você está logando precisa existir nesse banco:

- Se você rodou o **seed** nesse banco: use `admin-teste@adopet.com.br` / `admin123` (e coloque o ID `22222222-2222-2222-2222-222222222222` em **ADMIN_USER_IDS** no .env da API de dev na Vercel).
- Se o admin foi criado em **outro** banco (ex.: outro projeto Neon), esse usuário não existe no banco que a API de dev usa. Crie o usuário no banco de dev (seed ou script `db:create-admin-user` / `db:reset-user-password`) e use esse e-mail/senha no app.

---

## Resumo rápido

| Sintoma                         | O que fazer |
|---------------------------------|-------------|
| Health retorna 5xx ou HTML       | Conferir **DATABASE_URL** e **JWT_SECRET** para **Preview** na Vercel e redeploy. |
| Health 200, login retorna HTML  | Ver logs da função no deployment do branch development; conferir se o usuário existe no banco de dev. |
| Login retorna JSON com token    | API ok; se o app ainda falha, conferir **EXPO_PUBLIC_API_URL** no build (deve ser a URL do branch dev). |
