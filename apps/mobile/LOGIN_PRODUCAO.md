# Build de produção não consegue logar

Se o app instalado (APK/AAB ou TestFlight) mostra "Não foi possível entrar" com **"O servidor respondeu com erro. Tente novamente ou faça login (a conta pode ter sido criada)."**, a API está respondendo com **página de erro em HTML** (ex.: 502/503) em vez de JSON. Confira a seção **4** abaixo.

Nos demais casos ("Não foi possível entrar" ou "Ocorreu um erro. Tente novamente em instantes."), siga as verificações abaixo.

## 1. URL da API no EAS (causa mais comum)

No build de produção a URL da API é **definida no momento do build** (variável de ambiente no EAS). Se não estiver definida ou estiver como `localhost`, o app no celular tenta falar com "localhost", que no aparelho é o próprio celular — a API não está lá.

**O que fazer:**

1. Acesse [expo.dev](https://expo.dev) → seu projeto **Adopet** → **Secrets** (ou **Environment variables** / **Credentials** conforme o menu).
2. Confirme que existe uma variável para o ambiente **Production**:
   - **Name:** `EXPO_PUBLIC_API_URL`
   - **Value:** URL base da sua API **em produção**, **sem** `/v1`.  
     Exemplos:
   - `https://adopet-api-six.vercel.app` (se a API na Vercel está na raiz)
   - `https://adopet-api-six.vercel.app/api` (se a API está em `/api` e o backend responde em `/api/v1/...`)
3. Se a API estiver na Vercel, teste no navegador:
   - `https://sua-api.vercel.app/v1/health` deve retornar OK (200).
   - Se retornar 404, tente `https://sua-api.vercel.app/api/v1/health` e use a base que funcionar (com ou sem `/api`) em `EXPO_PUBLIC_API_URL`.
4. **Depois de alterar a variável, é obrigatório gerar um novo build** (o valor é embutido no app no momento do build):
   ```bash
   cd apps/mobile
   npx eas-cli build --platform android --profile production
   ```
   Instale o novo AAB/APK e tente logar de novo.

## 2. API fora do ar ou retornando erro

- Confirme que a API está acessível: abra no celular (navegador) ou no PC a URL `EXPO_PUBLIC_API_URL + '/v1/health'` (ex.: `https://sua-api.vercel.app/v1/health`).
- Se a API retornar 500 ou timeout, o login também falha. Verifique logs do backend (Vercel, etc.).

## 3. Rede / firewall

- O celular precisa conseguir acessar a URL da API (Wi‑Fi ou dados). Redes corporativas ou que bloqueiam HTTPS podem impedir.

## 4. Mensagem "O servidor respondeu com erro (a conta pode ter sido criada)"

Isso indica que a API respondeu com **HTML** (página de erro da Vercel) em vez de JSON. Possíveis causas:

### 4.1 Confirmar qual URL o app está usando

Na tela de **Login** do app instalado, logo abaixo da versão, aparece **API: &lt;url&gt;**. Confira:

- Deve ser `https://adopet-api-six.vercel.app` no build de **produção**.
- Se aparecer outra URL (ex.: da branch development), o AAB instalado não é o de prod — use o build gerado por `scripts/build-mobile-android-prod.sh` e suba esse AAB no teste fechado.

### 4.2 Testar login direto na API de produção

No terminal (use um e-mail/senha que exista no banco):

```bash
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "https://adopet-api-six.vercel.app/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"SEU_EMAIL","password":"SUA_SENHA"}'
```

- Se vier **JSON** com `accessToken` e no final `HTTP_CODE:201` → a API de prod está ok; o problema pode ser rede/CORS no app ou o app estar usando outra URL.
- Se vier **HTML** ou **HTTP_CODE:502/503/500** → a função da Vercel em **Production** está falhando. Siga o passo 4.3.

### 4.3 Variáveis de ambiente **Production** na Vercel

O deploy que atende `adopet-api-six.vercel.app` usa o ambiente **Production**. As variáveis precisam estar marcadas para **Production** (não só Preview):

1. Vercel → projeto da API → **Settings** → **Environment Variables**.
2. Para **DATABASE_URL** e **JWT_SECRET**: confira se existe entrada com **Production** marcado (ou "All Environments"). Se estiver só "Preview", a API de produção não as vê e pode retornar 502/500 (página em HTML).
3. Depois de alterar, faça **Redeploy** do último deployment de **Production**.

### 4.4 Ver o erro nos logs da Vercel

1. Vercel → projeto da API → **Deployments**.
2. Abra o deployment **Production** (o que serve adopet-api-six.vercel.app).
3. Aba **Functions** ou **Logs** (Runtime Logs).
4. Tente fazer login de novo no app e veja se aparece exceção (ex.: `DATABASE_URL is not set`, `JWT_SECRET undefined`, erro de conexão).

---

## Resumo

| Problema | Solução |
|----------|--------|
| `EXPO_PUBLIC_API_URL` não definida ou localhost no EAS Production | Definir a URL real da API no EAS e **gerar novo build**. |
| API em `/api` na Vercel | Usar `EXPO_PUBLIC_API_URL=https://...vercel.app/api`. |
| API retorna 404 em `/v1/health` | Ajustar a base (com ou sem `/api`) e refazer o build. |
| "Servidor respondeu com erro" (HTML em vez de JSON) | Ver seção 4: conferir URL no app, testar login com curl, variáveis **Production** na Vercel e logs. |
