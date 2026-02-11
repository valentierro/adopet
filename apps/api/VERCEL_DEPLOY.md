# Deploy da API na Vercel

Se o app mobile (ou o navegador) retorna **404: NOT_FOUND** ao acessar `https://seu-dominio.vercel.app/v1/health` ou ao fazer login/cadastro, a causa costuma ser o projeto na Vercel **não estar usando a pasta da API** como raiz do build.

## Configuração obrigatória no dashboard da Vercel

No projeto que serve a URL da API (ex.: `adopet-api-six.vercel.app`):

1. **Settings** → **General** → **Root Directory**
   - Defina como **`apps/api`** (e salve).
   - Assim a Vercel passa a buildar e publicar o NestJS que está em `apps/api`, e não a raiz do repositório.

2. **Build & Development**
   - **Framework Preset:** deixe em "Other" ou "None" (o `vercel.json` em `apps/api` já define o build).
   - **Build Command:** pode deixar em branco (o `vercel.json` usa `pnpm run build`) ou defina explicitamente `pnpm run build`.
   - **Install Command:** em monorepos com pnpm, a Vercel costuma rodar o install na raiz do repositório; se o build falhar por dependências, tente em **Root Directory** temporariamente em branco só para testar, ou use um Install Command que rode na raiz, por exemplo: `cd ../.. && pnpm install`.

3. **Variáveis de ambiente**
   - Configure no projeto (ex.: **Environment Variables**) todas as variáveis que a API precisa em produção: `DATABASE_URL`, `JWT_SECRET`, etc. (as mesmas que você usa no `.env` em desenvolvimento).

Depois de alterar o **Root Directory** para `apps/api`, faça um **novo deploy** (push no Git ou "Redeploy" no dashboard). Em seguida, teste de novo:

- `https://seu-dominio.vercel.app/v1/health`

Se responder com status 200 (e não mais 404), o app mobile e o login/cadastro devem passar a funcionar com essa URL.

---

## Diagnóstico quando continua 404 (NOT_FOUND)

Conforme a [documentação do erro NOT_FOUND](https://vercel.com/docs/errors/NOT_FOUND), vale conferir:

### 1. Domínio está no projeto certo?

- Em **cada** projeto da sua conta/team, vá em **Settings** → **Domains**.
- Confira em **qual** projeto aparece `adopet-api-six.vercel.app`.
- Se o domínio estiver no projeto da **landing** (ou em outro que não seja o da API), a Vercel vai servir aquele app nesse domínio e qualquer rota como `/v1/health` vira 404.
- **Correção:** no projeto da **API** (aquele com Root Directory = `apps/api`), adicione o domínio em **Settings** → **Domains**. No outro projeto, remova `adopet-api-six.vercel.app` para não haver conflito.

### 2. O build do projeto da API terminou com sucesso?

- Abra o projeto **adopet-api** (ou o que tem Root Directory = `apps/api`).
- Vá em **Deployments** e abra o último deployment (Production).
- Veja a aba **Building** (ou os logs do build).
- Se o build tiver **falhado**, a Vercel pode estar servindo um deploy antigo ou uma página de erro; rotas como `/v1/health` não existem nesse deploy → 404.
- **Correção:** corrija o erro do build (ex.: dependência faltando, `prisma generate` ou `nest build` falhando, variável de ambiente obrigatória no build). Depois faça um novo deploy.

### 3. O deploy está realmente “Ready”?

- No mesmo deployment, confira se o status está **Ready** (verde).
- Se estiver **Error** ou **Canceled**, esse deploy não está servindo a API.
- **Correção:** use um deployment que tenha ficado Ready ou faça um novo deploy após corrigir o que causou o erro.

### 4. Logs de runtime (se o build passou e mesmo assim 404)

- No deployment, abra **Functions** ou **Runtime Logs**.
- Faça uma requisição de teste a `https://adopet-api-six.vercel.app/v1/health` e veja se aparece algum log ou erro (ex.: exceção ao subir o Nest, `DATABASE_URL` faltando, etc.).
- Se a função não for invocada para `/v1/health`, o roteamento pode estar errado (projeto/domínio errado ou função não registrada para esse caminho).

Resumindo: na maioria dos casos o 404 persiste porque o **domínio está no projeto errado** ou o **build do projeto da API falhou**. Confirme primeiro o domínio e o build.
