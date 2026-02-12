# Troubleshooting — Teste fechado (Play Store)

## “Sem conexão. Verifique sua internet e tente novamente” ao fazer login

Esse erro aparece quando o app **não consegue falar com a API**. No teste fechado, a causa mais comum é a **URL da API não estar configurada (ou estar errada) no build de produção**.

### O que acontece

- O AAB foi gerado com o perfil **production** (`eas build --profile production`).
- Nesse build, a URL da API vem da variável **`EXPO_PUBLIC_API_URL`** definida no **Expo (EAS)** para o ambiente **Production**.
- Se a variável **não existir** ou estiver **incorreta** (por exemplo `http://localhost:3000`), o app tenta acessar um endereço que o celular não alcança → o `fetch` falha → o app mostra “Sem conexão”.

### Como corrigir

1. **Confirme a URL da API em produção**
   - Exemplo: se a API está na Vercel, algo como `https://adopet-api.vercel.app` (ou a URL real do seu projeto).
   - A URL deve ser **HTTPS** (no Android, HTTP sem SSL costuma ser bloqueado).
   - **Não** inclua `/v1` no final; o app adiciona isso nas requisições.

2. **Configure a variável no Expo**
   - Acesse [expo.dev](https://expo.dev) → seu projeto **Adopet** → **Environment variables** (ou **Secrets**).
   - Para o ambiente **Production**:
     - Nome: `EXPO_PUBLIC_API_URL`
     - Valor: `https://sua-api-real.vercel.app` (a URL da sua API, sem `/v1` e sem barra no final).
   - Salve.

3. **Gere um novo build e use esse AAB no teste fechado**
   - As variáveis são “embutidas” no build no momento em que você roda o EAS. Só alterar no painel **não** altera o AAB que já foi baixado.
   - Rode de novo:
     ```bash
     cd apps/mobile
     npx eas build --platform android --profile production
     ```
   - Quando terminar, baixe o novo **.aab** e envie para a Play Console (nova versão no teste fechado).

4. **Teste a API no celular (opcional)**
   - No navegador do celular, abra: `https://sua-api-real.vercel.app/v1/health` (ou o endpoint de health da sua API).
   - Se não abrir, o problema pode ser rede, firewall ou a API fora do ar.

### Resumo

| Causa provável | Ação |
|----------------|------|
| `EXPO_PUBLIC_API_URL` não definida para **Production** no EAS | Definir no expo.dev e fazer **novo build** (production). |
| URL errada (localhost, typo, outro ambiente) | Corrigir no expo.dev para a URL HTTPS real da API e fazer **novo build**. |
| API fora do ar ou inacessível | Verificar deploy na Vercel e endpoint `/v1/health` no navegador do celular. |

Depois de configurar a URL correta e publicar um novo AAB no teste fechado, os testadores devem conseguir fazer login normalmente (desde que a API esteja no ar).

---

## “Serviço temporariamente indisponível” ou “Não encontramos o que você buscou” ao criar conta ou fazer login

Esse erro aparece quando a API responde **404 (Not Found)**. No login/cadastro isso costuma significar que a **rota não existe** no endereço que o app está chamando — em geral por causa do **caminho base da API na Vercel**.

### O que fazer

1. **Testar a URL da API no navegador**
   - Abra no celular ou no PC: `https://adopet-api-six.vercel.app/v1/health`
   - Se aparecer **404** ou página em branco, tente com **`/api`** na frente: `https://adopet-api-six.vercel.app/api/v1/health`
   - Use a **URL base que funcionar** (com ou sem `/api`) na variável do app.

2. **Ajustar a variável no Expo (EAS)**
   - Se **só** `.../api/v1/health` responder certo, a base da API na Vercel é `https://adopet-api-six.vercel.app/api`.
   - No expo.dev → Environment variables → **Production**, defina:
     - `EXPO_PUBLIC_API_URL` = `https://adopet-api-six.vercel.app/api`  
     (sem `/v1`, sem barra no final; o app adiciona `/v1` nas requisições.)
   - Se `.../v1/health` (sem `/api`) já responder, mantenha:
     - `EXPO_PUBLIC_API_URL` = `https://adopet-api-six.vercel.app`

3. **Novo build e novo AAB**
   - Depois de salvar a variável, gere um novo build de produção e envie o novo .aab para o teste fechado.

### Resumo

| O que acontece | Ação |
|----------------|------|
| `/v1/health` retorna 404, `/api/v1/health` responde OK | Usar `EXPO_PUBLIC_API_URL` = `https://adopet-api-six.vercel.app/api` e fazer novo build. |
| `/v1/health` já responde OK | Manter `EXPO_PUBLIC_API_URL` = `https://adopet-api-six.vercel.app`; se o app ainda der 404, conferir deploy e rotas na Vercel. |
