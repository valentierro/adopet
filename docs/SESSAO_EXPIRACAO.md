# Sessão do usuário: expiração e tratamento

## Tempos de expiração (API)

| Token | Duração | Onde está definido |
|-------|---------|--------------------|
| **Access token (JWT)** | **15 minutos** | `apps/api/src/auth/auth.module.ts` (`signOptions: { expiresIn: '15m' }`) e `auth.service.ts` (`ACCESS_TOKEN_EXPIRES = '15m'`) |
| **Refresh token** | **7 dias** | `auth.service.ts`: `REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000` e `expiresIn: '7d'` no JWT do refresh |

Ou seja: a “sessão” usada em cada requisição (Bearer) expira em **15 min**. O refresh token, usado para renovar o access token sem pedir senha de novo, vale **7 dias**.

---

## Expiração por inatividade (15 min)

O app rastreia a **última atividade** (cada requisição bem-sucedida) em `authStore.lastActivityAt`. Após **15 min** sem atividade:

- O refresh proativo (a cada 5 min) **não** roda.
- Na próxima requisição que retornar 401, o app **não** chama refresh — trata como sessão expirada.
- Faz logout, exibe o modal "Sessão expirada" e redireciona para o feed de convidado.

---

## O que acontece quando o access token expira?

1. **Requisição com token expirado**  
   A API responde **401 Unauthorized**. O Passport JWT rejeita o token (ex.: mensagem `"jwt expired"`).

2. **No app (client)**  
   - O `client.ts` intercepta **401**.
   - **Se inativo há 15+ min:** faz logout, exibe modal "Sessão expirada" e redireciona para o feed de convidado. Não tenta refresh.
   - **Caso contrário:** chama `refreshAndRetry()` (que usa o `refreshTokens` do `authStore`).
   - Se existir **refresh token** válido (não expirado, não revogado):
     - Chama `POST /auth/refresh` com o refresh token.
     - A API devolve **novo** access token e **novo** refresh token.
     - O store persiste os dois e a requisição original é **refeita** com o novo access token (o usuário não vê erro).
   - Se o refresh **falhar** (token expirado, inválido ou inexistente):
     - `refreshTokens()` faz logout (limpa tokens no app e no storage) e retorna `false`.
     - Exibe o modal "Sessão expirada" e redireciona para o feed de convidado.

3. **Problema que você relatou**  
   Qualquer 401 era mapeado em `getFriendlyErrorMessage` para **“E-mail ou senha incorretos”**. Assim, quando a sessão expirava (ou o refresh falhava), o usuário via “usuário/senha incorretos” ao tentar **atualizar anúncio, perfil, etc.**, mesmo com login correto. A causa real era **sessão expirada** (ou refresh inválido), não credencial errada.

---

## Ajuste feito no app

- Em **`apps/mobile/src/utils/errorMessage.ts`**:
  - Para respostas 401 cuja mensagem indica **token/sessão expirada** (ex.: `"jwt expired"`, `"Refresh token inválido ou expirado"`), a mensagem amigável passou a ser: **“Sua sessão expirou. Faça login novamente.”**
  - Isso evita mostrar “E-mail ou senha incorretos” quando o problema é só expiração de sessão.

Assim, ao tentar atualizar algo e a sessão já tiver expirado (e o refresh não conseguir renovar), o usuário vê que precisa **entrar de novo**, em vez de achar que a senha está errada.

---

## Resumo

- **Access token:** 15 min.  
- **Refresh token:** 7 dias.  
- Ao expirar o access token, o app tenta renovar com o refresh; se conseguir, a ação segue sem erro.  
- Se o refresh falhar, o app desloga e, em caso de 401 por token/sessão, a mensagem exibida é **“Sua sessão expirou. Faça login novamente.”**
