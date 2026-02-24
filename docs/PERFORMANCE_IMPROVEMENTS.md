# Sugestões de melhoria de performance – Adopet

Análise do projeto (mobile + API) com foco em performance. Itens ordenados por impacto esperado e esforço.

---

## 1. Mobile (React Native / Expo)

### 1.1 Chat: reduzir polling quando a tela está em segundo plano

**Problema:** Na tela de chat (`apps/mobile/app/(tabs)/chat/[id].tsx`), `conversation` e `messages` usam `refetchInterval: 1500` e `2500` ms. Isso gera requisições a cada 1,5–2,5 s mesmo com o app em background ou usuário em outra aba.

**Sugestão:**
- Usar `refetchIntervalInBackground: false` para não fazer polling em background.
- Aumentar o intervalo quando em foco (ex.: 4–5 s para conversation, 5 s para messages) para reduzir carga no servidor e bateria.
- Manter refetch no `useFocusEffect` ao voltar à tela.

**Impacto:** Menos requisições, menor uso de bateria e rede.

---

### 1.2 Dashboard (Início): evitar pico de requisições no primeiro carregamento

**Problema:** Na tela inicial (`apps/mobile/app/(tabs)/index.tsx`), até **8 queries** disparam em paralelo assim que o usuário abre o app: `me`, `preferences`, `tutor-stats`, `pets/mine`, `favorites`, `conversations`, `feed`, `adoptions`, `passed`, `pending-adoption-confirmations`. Isso pode causar lentidão em redes fracas e pico de carga na API.

**Sugestão:**
- Priorizar o que é necessário para a primeira pintura: `me`, `preferences` e, se possível, `conversations` (badge) e `feed` (preview).
- Carregar o restante com `enabled` dependente de “dados críticos já carregados” ou com pequeno delay (ex.: `setTimeout` ou query com `enabled: !!user` para adoptions/passed/pending).
- Ou usar `placeholderData` / dados em cache para exibir contadores “último valor conhecido” e atualizar em seguida.

**Impacto:** Primeira tela mais rápida, menos contenção de rede.

---

### 1.3 FlatList: otimizar listas longas (Favoritos, Meus anúncios, etc.)

**Problema:** As listas em Favoritos, Meus anúncios, Pets que passou, Minhas adoções e Chat usam `FlatList` sem `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` ou `getItemLayout`. Com muitos itens, a rolagem pode travar e o uso de memória aumenta.

**Sugestão:**
- Definir, por exemplo: `initialNumToRender={10}`, `maxToRenderPerBatch={5}`, `windowSize={5}`.
- Se a altura dos itens for fixa (ex.: lista em modo lista), usar `getItemLayout` para evitar medição e melhorar scroll.
- Avaliar **FlashList** (@shopify/flash-list) nas listas mais longas: drop-in similar ao FlatList, com melhor desempenho de scroll e menos células em memória.

**Impacto:** Rolagem mais fluida e menor uso de memória em listas grandes.

---

### 1.4 Memoização dos itens de lista

**Problema:** Em várias telas, o `renderItem` do FlatList cria componentes inline. Qualquer re-render do pai faz o FlatList considerar que todos os itens podem ter mudado, aumentando trabalho desnecessário.

**Sugestão:**
- Extrair o item de lista para um componente (ex.: `FavoriteRow`, `MyPetRow`) e envolver com `React.memo`.
- Garantir que as props passadas sejam estáveis (evitar objetos/arrays criados dentro do render; usar `useCallback` para handlers).
- Onde já existir componente separado (ex.: `PetCard`), garantir que esteja memoizado se receber props que mudam pouco.

**Impacto:** Menos re-renders e scroll mais estável.

---

### 1.5 Imagens: usar expo-image onde ainda for Image do RN

**Problema:** Vários lugares usam `Image` do `react-native` (ex.: avatar no perfil, thumbs em adoption-confirm, map, admin, partner-portal). O `expo-image` oferece cache em disco/memória e melhor comportamento com muitas imagens.

**Sugestão:**
- Trocar `import { Image } from 'react-native'` por `import { Image } from 'expo-image'` nas telas de listagem e onde houver muitas thumbnails (ex.: profile avatar, adoption-confirm, map, admin, partner logos).
- Manter `contentFit` e `style` compatíveis para não mudar o layout.

**Impacto:** Menos rede repetida e menos travamentos ao rolar listas com fotos.

---

### 1.6 Perfil: refetch apenas quando necessário

**Problema:** No Perfil, `useFocusEffect` chama `refetchMe`, `refetchVerification`, `refetchTutorStats` e `refetchPendingConfirmations` **toda vez** que a aba Perfil ganha foco. Se o usuário alternar muito entre abas, isso gera muitas requisições.

**Sugestão:**
- Confiar no `staleTime` do React Query (já 30–60 s) e não refetch em todo focus; ou refetch apenas se os dados estiverem stale (o próprio React Query já refetch on window focus por padrão, pode ser suficiente).
- Se quiser manter “sempre fresco no perfil”, pelo menos aumentar um pouco o `staleTime` ou usar `refetchOnWindowFocus: false` para essas queries e fazer um único refetch manual no focus (evitando 4 refetches em paralelo em todo focus).

**Impacto:** Menos requisições ao trocar de aba.

---

## 2. API (NestJS)

### 2.1 Índice composto no feed de pets

**Problema:** O feed (`FeedService.getFeed`) filtra por `status: 'AVAILABLE'`, `publicationStatus: 'APPROVED'`, `expiresAt` (null ou > now), e ordena por `id` (decrescente). O modelo `Pet` no Prisma não tem índice composto para essa combinação, o que pode resultar em full table scan em bases grandes.

**Sugestão:** Adicionar índice composto, por exemplo:

```prisma
// Em model Pet, adicionar:
@@index([publicationStatus, status, expiresAt, id])
```

Ajustar a ordem dos campos conforme o plano de execução no seu banco (ex.: status + publicationStatus primeiro se forem os filtros mais seletivos). Rodar migration e validar com `EXPLAIN` no PostgreSQL.

**Impacto:** Resposta do feed mais rápida com muitos pets.

---

### 2.2 Cache para getReportedPetIds()

**Problema:** `getReportedPetIds()` é chamado em **cada** requisição de feed (e em outros fluxos). O resultado muda apenas quando uma denúncia é criada ou resolvida, mas hoje não há cache.

**Sugestão:**
- Cache em memória com TTL curto (ex.: 1–5 minutos): ao entrar no feed, ler da cache; ao resolver/criar report, invalidar.
- Se no futuro houver Redis no projeto, usar Redis com TTL para o mesmo dado.
- Manter a assinatura do método e encapsular a lógica de cache em um serviço/interceptor ou dentro do ReportsService.

**Impacto:** Menos consultas ao banco por requisição de feed; ganho maior com muitas requisições simultâneas.

---

### 2.3 Compressão de respostas HTTP (gzip)

**Problema:** A API não usa middleware de compressão. Respostas grandes (ex.: feed com 20 pets, listas de conversas) são enviadas sem compressão.

**Sugestão:**
- Instalar `compression`: `npm i compression` e `npm i -D @types/compression`.
- No `app-bootstrap.ts` (ou no `main.ts` antes de `createApp`), usar `app.use(compression())` no pipeline do Express.
- Garantir que o middleware seja registrado antes das rotas.

**Impacto:** Menor tamanho de payload, especialmente em mobile com rede lenta; tempo de resposta percebido menor.

---

### 2.4 Feed: limitar campos no include (já está razoável)

**Situação:** O feed já usa `include` com `select` em `owner` e `partner`. As mídias vêm com `orderBy`. Vale manter apenas os campos necessários no DTO final e evitar incluir relações pesadas sem necessidade.

**Sugestão:** Revisão pontual em outros endpoints que fazem `findMany`/`findUnique` com `include` grande; garantir que nenhum campo desnecessário seja carregado (ex.: não trazer `description` ou textos longos em listagens).

**Impacto:** Pequeno, mas consistente em várias rotas.

---

## 3. Resumo prioritizado

| Prioridade | Onde | Ação | Impacto |
|-----------|------|------|---------|
| Alta | Chat | refetchIntervalInBackground: false e intervalos maiores | Rede e bateria |
| Alta | API | Índice composto no Pet para feed | Latência do feed |
| Alta | API | Cache para getReportedPetIds | Carga no DB e latência |
| Média | Dashboard | Reduzir/atrasar queries no primeiro load | Tempo até primeira tela |
| Média | FlatLists | initialNumToRender, windowSize, getItemLayout ou FlashList | Scroll e memória |
| Média | API | compression() nas respostas | Payload e tempo percebido |
| Média | Listas | React.memo nos itens de lista | Re-renders e fluidez |
| Baixa | Imagens | expo-image onde ainda for Image (RN) | Cache e listas com fotos |
| Baixa | Perfil | Ajustar refetch on focus | Menos requisições ao trocar aba |

---

## 4. Próximas sugestões (opcional)

Itens adicionais que podem trazer ganho quando fizer sentido:

### 4.1 Lista de Conversas com FlatList

**Onde:** `apps/mobile/app/(tabs)/chats.tsx`  
**Situação:** A lista de conversas usa `conversations.map()` dentro de um `ScreenContainer scroll`. Todas as linhas são montadas de uma vez.  
**Sugestão:** Trocar para `FlatList` com `data={conversations}`, `renderItem`, `keyExtractor`, e as mesmas props de otimização (`initialNumToRender`, `windowSize`). Manter o header (PageIntro, aviso, hint) em `ListHeaderComponent`.  
**Impacto:** Com muitas conversas, menos memória e scroll mais estável.

### 4.2 FlashList nas listas maiores

**Onde:** Favoritos, Meus anúncios, Pets que passou, Minhas adoções.  
**Sugestão:** Avaliar **@shopify/flash-list**: API parecida com FlatList, melhor desempenho de scroll e menos células em memória. Troca gradual (uma tela por vez).  
**Impacto:** Rolagem mais fluida em listas com dezenas/centenas de itens.

### 4.3 Lazy load das abas

**Onde:** Layout das tabs (expo-router / React Navigation).  
**Sugestão:** Se a lib suportar, usar **lazy** para as telas de tab (Feed, Administração, etc.) para que o conteúdo só monte quando o usuário abrir a aba pela primeira vez. Reduz trabalho no primeiro paint.  
**Impacto:** Primeira tela mais leve; abas pouco usadas (ex.: Admin) não disparam queries até serem abertas.

### 4.4 Cache de resposta na API (HTTP cache headers)

**Onde:** Endpoints de listagem que mudam pouco (ex.: lista de espécies/raças se existir, ou configurações públicas).  
**Sugestão:** Enviar `Cache-Control: public, max-age=60` (ou maior) em respostas idempotentes e pouco mutáveis. O cliente (ou CDN) pode reutilizar a resposta sem nova requisição.  
**Impacto:** Menos chamadas e latência menor para dados estáticos ou quase estáticos.

### 4.5 Monitoramento de lentidão

**Onde:** API (NestJS) e, se possível, mobile.  
**Sugestão:** Logar duração de endpoints pesados (feed, listas, conversas) quando acima de um threshold (ex.: > 500 ms). Opcional: integração com APM (Sentry, DataDog, etc.) para ver P95/P99 por rota.  
**Impacto:** Visibilidade para priorizar otimizações e regressões.

---

## 5. Métricas sugeridas (opcional)

- **Mobile:** Tempo até primeira tela (TTI), tempo até lista interativa nas abas Favoritos/Meus anúncios, uso de memória ao rolar listas longas, número de requisições por sessão.
- **API:** P95/P99 do endpoint de feed, tempo de resposta do `getReportedPetIds`, tamanho médio da resposta do feed (antes/depois da compressão).

Com isso, você consegue validar o impacto de cada mudança e priorizar as próximas.

---

## 6. Já implementado (referência)

- Chat: `refetchIntervalInBackground: false`, intervalos 4,5 s / 5 s.
- Dashboard: queries com `enabled: hasUser` (após getMe).
- **FlashList** em Favoritos, Meus anúncios, Pets que passou, Minhas adoções e Conversas (com `estimatedItemSize`); FavoriteRow com `React.memo`.
- FlatLists (feed grid): `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`.
- PetCard e FeedCard com `React.memo`.
- **expo-image** em perfil, adoption-confirm, map, profile-edit, admin, partner-portal, feed (logo), welcome, LoadingLogo, HeaderLogo, MatchOverlay.
- Perfil: remoção do refetch em todo focus.
- **Lazy tabs:** `lazy: true` no layout das tabs (expo-router).
- API: índice Pet (feed) `[publicationStatus, status, id]` e **`[publicationStatus, status, expiresAt, id]`**; cache getReportedPetIds; compression gzip; índices Conversation/Message/Favorite/Pet(ownerId)/Report.
- **Cache-Control:** `public, max-age=60` em `/health` e `/public/stats`.
- **Monitoramento:** interceptor que loga requisições lentas (≥ 500 ms) com `[slow] METHOD url durationMs` e envia **`X-Response-Time`** em toda resposta (para medição).
- React Query: `gcTime: 5 min` global; Conversas com `staleTime: 60_000`.
- Revisão de includes: feed e listagens principais já usam `select`/`include` enxuto (owner city, partner id/name/slug/logoUrl/isPaidPartner, media orderBy).

---

## 7. Como mensurar o ganho

Não há métricas “antes” capturadas automaticamente, então o ganho não pode ser comparado de forma exata. A partir de agora você pode medir assim:

### API

1. **Header `X-Response-Time`**  
   Toda resposta da API inclui `X-Response-Time: <N>ms`. Use no navegador (aba Network), Postman ou curl:

   ```bash
   # Exemplo (substitua BASE e o token JWT):
   curl -s -D - -o /dev/null -H "Authorization: Bearer SEU_JWT" "https://sua-api/v1/feed?cursor=" | grep -i x-response-time
   ```

2. **Script de benchmark (API)**  
   Na pasta da API há um script que mede `X-Response-Time` das rotas principais:

   ```bash
   cd apps/api
   BASE_URL=http://localhost:3000/v1 JWT=seu_jwt ./scripts/benchmark-routes.sh
   ```

   Use isso como linha de base: rode após deploy e guarde os números; em releases futuros, compare para detectar regressões ou ganhos.

3. **Benchmark rápido (várias chamadas)**  
   Rode várias requisições e veja a distribuição dos tempos (média, máx.):

   ```bash
   for i in 1 2 3 4 5 6 7 8 9 10; do
     curl -s -D - -o /dev/null -H "Authorization: Bearer SEU_JWT" "https://sua-api/v1/feed"
   done 2>&1 | grep -i x-response-time
   ```

4. **Logs de requisições lentas**  
   Com a API rodando, requisições que levarem ≥ 500 ms aparecem no console como `[slow] GET /v1/feed 620ms`. Útil para ver picos em produção/staging.

5. **Tamanho do payload (compressão)**  
   No DevTools (Network), compare o tamanho da resposta do feed (e outras listas) com e sem `Accept-Encoding: gzip`. Com compressão, o tamanho transferido deve ser bem menor.

### Mobile

1. **Scroll e memória**  
   FlashList e virtualização reduzem células montadas e reciclam views. Para sentir o ganho: abra Favoritos ou Meus anúncios com muitos itens e role rápido; compare com um build antigo se tiver (mesmo dispositivo).

2. **React DevTools Profiler**  
   Grave uma sessão ao abrir uma lista e rolar; compare “Commit duration” e número de componentes renderizados antes/depois (se tiver um build anterior).

3. **Requisições por sessão**  
   Com lazy tabs + menos refetch no perfil + intervalos maiores no chat, o número de chamadas por sessão tende a cair. Dá para inspecionar no Network do app (Flipper, React Native Debugger ou proxy) contando requests ao trocar de abas e ficar no chat.

### Resumo

| O que medir              | Onde ver / como |
|--------------------------|------------------|
| Tempo por request (API)  | Header `X-Response-Time` ou logs `[slow]` |
| Tamanho da resposta      | Network (DevTools) com gzip ativo |
| Fluidez de listas (app)  | Uso + Profiler (componentes renderizados) |
| Volume de requests (app) | Network / proxy ao navegar no app |

Para um “antes x depois” numérico no futuro: rodar o mesmo script de curl (feed, conversas, favoritos) em dois builds e comparar médias e P95 do `X-Response-Time`.
