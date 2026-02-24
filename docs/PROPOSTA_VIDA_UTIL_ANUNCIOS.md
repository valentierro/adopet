# Vida útil de anúncios (60 dias + prorrogação)

Avaliação do mecanismo proposto e sugestões de melhoria.

---

## Resumo da ideia original

- Anúncios têm **vida útil de 60 dias** por padrão.
- **Faltando 10 e 5 dias** para expirar → enviar mensagem (pelo app) ao tutor.
- Tutor entra no cadastro do pet e **clica em um botão para prorrogar** → contador volta a **60 dias**.
- Se o tutor **não prorrogar** → anúncio é **removido** da base (com cuidado nos relacionamentos).
- Se havia **chat aberto** → marcar no chat que o anúncio foi removido por falta de confirmação.
- **Pets já adotados** não entram nessa regra (já saem do feed); ficam no histórico.

---

## Avaliação

### Pontos fortes

- **Reduz anúncios “esquecidos”** (pet já adotado ou indisponível e tutor não atualiza).
- **60 dias** é um bom padrão: tempo útil sem ser curto demais.
- **Avisos em 10 e 5 dias** dão margem para o tutor prorrogar.
- **Um clique para prorrogar** mantém a fricção baixa.
- **Histórico preservado** para pets adotados faz sentido (Minhas adoções, relatórios).
- **Avisar no chat** que o anúncio foi removido é boa UX para quem estava conversando.

### Riscos e ajustes necessários

1. **Remover “completamente da base” (hard delete)**  
   Hoje **Conversation** e **Message** dependem de **Pet** (e outros relacionamentos também). Se o pet for **deletado**, o banco pode apagar conversas em cascata (dependendo do schema), e aí não dá para “marcar no chat” que o anúncio foi removido.  
   **Sugestão:** não fazer hard delete. Usar **“expiração” (soft)** do anúncio: o pet continua na base com um estado tipo “expirado” e some do feed e da lista “Meus anúncios” ativos; conversas e histórico continuam existindo e podemos mostrar no chat que o anúncio foi removido por falta de confirmação.

2. **Onde avisar (10 e 5 dias)**  
   “Mensagem pelo app” pode ser:
   - **Push** (como os lembretes que já existem).
   - **Banner/card na tela** (ex.: Meus anúncios ou Início) quando houver anúncio expirando em breve.  
   **Sugestão:** usar **push** em 10 e 5 dias e, opcionalmente, um **banner in-app** em Meus anúncios (“X anúncio(s) expira(m) em Y dias – prorrogue para manter ativo”).

3. **Chat: como marcar que o anúncio foi removido**  
   Opções:
   - **Mensagem de sistema** na conversa: “Este anúncio foi removido por falta de confirmação do anunciante. O pet não está mais disponível no feed.”
   - Ou um **campo na conversa** (ex.: `listingRemovedAt`) e o app exibe um aviso no topo do chat.  
   **Sugestão:** **mensagem de sistema** (registro explícito, visível no histórico) + opcionalmente um campo na conversa para o app destacar o aviso.

4. **Pets adotados**  
   Só aplicar vida útil para status **AVAILABLE** e **IN_PROCESS**. Para **ADOPTED** (e com registro em Adoption), não expirar; continuam no histórico. Ok com a sua ideia.

5. **Relacionamentos**  
   Com **soft delete / expiração** (pet continua no banco, só “expirado”):
   - **Conversas e mensagens** permanecem; dá para inserir a mensagem de sistema.
   - **Favoritos:** pode manter o favorito e no app mostrar “Anúncio expirado” ou remover da lista de favoritos ativos (esconder os expirados).
   - **Swipes:** permanecem para analytics; feed já não mostra o pet.
   - **Reports / Adoption:** sem impacto.

---

## Proposta de desenho (com melhorias)

### 1. Schema

- **Pet**
  - `expiresAt: DateTime?` — data em que o anúncio expira (null = não usa vida útil, ex.: antigos; ou “nunca” em uma fase de rollout).
  - Ao criar/aprovar anúncio: `expiresAt = now() + 60 dias`.
  - Ao prorrogar: `expiresAt = now() + 60 dias`.
- **Conversation** (opcional)
  - `listingRemovedAt: DateTime?` — preenchido quando o anúncio expira sem prorrogação; o app pode mostrar aviso no topo do chat.
- **Message**
  - Já existe suporte a mensagens (ex.: texto, imagem). Inserir uma **mensagem de sistema** (ex.: `senderId = null` ou um “system” flag) com o texto de “anúncio removido por falta de confirmação”.

Regra de exibição no feed e em “Meus anúncios”:

- Só listar pets com `status IN ('AVAILABLE', 'IN_PROCESS')` **e** (`expiresAt` null **ou** `expiresAt > now()`).  
Pets com `expiresAt <= now()` são considerados **expirados**: não aparecem no feed nem como ativos em Meus anúncios, mas continuam no banco para histórico e chat.

### 2. Fluxo

1. **Criação/aprovação do anúncio**  
   Quando o pet passa a aparecer no feed (ex.: `publicationStatus = APPROVED`), definir `expiresAt = now() + 60 dias`.  
   (Se quiser aplicar só a anúncios novos, pode deixar `expiresAt = null` para os que já existiam e, em uma migração, preencher para os ativos.)

2. **Avisos (10 e 5 dias antes)**  
   Job periódico (ex.: 1x por dia) que:
   - Busca pets com `status IN ('AVAILABLE', 'IN_PROCESS')`, `expiresAt` não nulo, e `expiresAt` entre **amanhã e daqui a 10 dias** (para o aviso de 10 dias) ou entre **amanhã e daqui a 5 dias** (para o aviso de 5 dias).
   - Evita enviar o mesmo aviso várias vezes (ex.: flag `reminder10SentAt` / `reminder5SentAt` no Pet, ou tabela de “envios de lembrete”).
   - Envia **push** ao tutor: “O anúncio de [nome do pet] expira em X dias. Toque para prorrogar e manter ativo.”
   - Opcional: marcar “tem anúncio expirando” para mostrar **banner** em Meus anúncios.

3. **Prorrogação**  
   Endpoint (ex.: `PATCH /pets/:id/extend` ou `POST /pets/:id/extend`) ou ação na tela de edição do pet:
   - Só o dono do pet.
   - Só se o pet ainda estiver “ativo” (não expirado, não adotado): `expiresAt > now()` ou ainda dentro do prazo.
   - Ao prorrogar: `expiresAt = now() + 60 dias` (e opcionalmente limpar flags de “lembrete 10/5 enviado” para os próximos ciclos).

4. **Expiração (quando o prazo acaba)**  
   Job diário:
   - Pets com `status IN ('AVAILABLE', 'IN_PROCESS')` e `expiresAt <= now()`.
   - **Não** deletar o pet. Marcar como expirado (ex.: novo status `EXPIRED` ou só usar `expiresAt <= now()` como critério).
   - Para cada conversa desse pet:
     - Definir `Conversation.listingRemovedAt = now()` (se o campo existir).
     - Inserir **mensagem de sistema**: “Este anúncio foi removido por falta de confirmação do anunciante. O pet não está mais disponível no feed.”
   - Opcional: enviar **push** ao tutor: “O anúncio de [nome] expirou e foi removido do feed. Você pode criar um novo anúncio quando quiser.”

5. **Pets adotados**  
   Não incluir no job de expiração pets com `status = 'ADOPTED'` (e opcionalmente só os que têm registro em **Adoption**). Eles permanecem no histórico (Minhas adoções, etc.) sem prazo de 60 dias.

### 3. UX no app

- **Meus anúncios**  
  - Listar só anúncios ativos (não expirados).  
  - Em cada card/item, mostrar “Expira em X dias” e botão **“Prorrogar por 60 dias”**.  
  - Se quiser, uma seção “Anúncios expirados” (só leitura, sem prorrogar) para histórico.

- **Chat**  
  - Se `listingRemovedAt` estiver preenchido (ou existir mensagem de sistema de “anúncio removido”), mostrar no topo: “Este anúncio foi removido por falta de confirmação do anunciante.”

- **Favoritos**  
  - Esconder ou marcar como “Anúncio expirado” os pets com anúncio já expirado.

---

## Resumo das melhorias sugeridas

| Aspecto | Sua ideia | Sugestão |
|--------|------------|----------|
| Remoção | Remover completamente da base | **Soft delete / expiração**: pet fica na base com estado “expirado”; não some do histórico; conversas intactas. |
| Avisos | Mensagem pelo app (10 e 5 dias) | **Push** em 10 e 5 dias + opcional **banner** em Meus anúncios. |
| Chat | Marcar que anúncio foi removido | **Mensagem de sistema** na conversa + opcional campo `listingRemovedAt` na Conversation. |
| Contador | 60 dias, botão prorroga +60 | **Campo `expiresAt`** no Pet; prorrogar = `expiresAt = now() + 60 dias`. |
| Adotados | Não validar; ficar no histórico | **Excluir do job** pets com status ADOPTED (e com Adoption); mantidos no histórico. |

Se quiser, o próximo passo é desenhar os campos exatos no Prisma (Pet.expiresAt, Conversation.listingRemovedAt, flags de lembrete), os endpoints (prorrogação, listagem “expirando em X dias”) e os jobs (avisos 10/5 dias, expiração diária + mensagem de sistema no chat).
