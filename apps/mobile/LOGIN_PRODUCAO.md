# Build de produção não consegue logar

Se o app instalado (APK/AAB ou TestFlight) mostra "Não foi possível entrar" ou "Ocorreu um erro. Tente novamente em instantes." ao fazer login, confira o seguinte.

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

## Resumo

| Problema | Solução |
|----------|--------|
| `EXPO_PUBLIC_API_URL` não definida ou localhost no EAS Production | Definir a URL real da API no EAS e **gerar novo build**. |
| API em `/api` na Vercel | Usar `EXPO_PUBLIC_API_URL=https://...vercel.app/api`. |
| API retorna 404 em `/v1/health` | Ajustar a base (com ou sem `/api`) e refazer o build. |
