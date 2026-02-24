# Engine de anúncios com parceria

Especificação do fluxo de parceria em anúncios de pets: validação pelo parceiro, múltiplos parceiros, exceção para membro de ONG e cancelamento pelo parceiro.

---

## 1. Objetivos

- **Anunciante** pode marcar um ou mais parceiros no último step da publicação; o badge só aparece após confirmação do parceiro (exceto membro de ONG).
- **Parceiro** recebe solicitação no portal, pode confirmar ou rejeitar; pode cancelar parceria a qualquer momento (badge é removido).
- **Membro de ONG**: ao anunciar, se marcar a própria ONG, parceria é confirmada automaticamente (sem fluxo de aprovação).
- **UI**: substituir chips por busca com autocomplete para seleção de parceiro(s), permitindo múltiplos e escalável.

---

## 2. Modelo de dados

### 2.1 Nova tabela: `PetPartnership`

Relação N:N entre Pet e Partner com status (substitui o uso direto de `Pet.partnerId` para o badge).

```prisma
model PetPartnership {
  id              String    @id @default(uuid())
  petId           String
  pet             Pet       @relation(fields: [petId], references: [id], onDelete: Cascade)
  partnerId       String
  partner         Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  status          String    // PENDING | CONFIRMED | CANCELLED
  requestedById   String    // userId do anunciante
  requestedBy     User      @relation(fields: [requestedById], references: [id], onDelete: Cascade)
  confirmedById  String?   // userId do admin/membro do parceiro que confirmou
  confirmedAt    DateTime?
  cancelledAt    DateTime?
  cancelledById  String?   // userId de quem cancelou (parceiro ou sistema)
  createdAt      DateTime  @default(now())

  @@unique([petId, partnerId])
  @@index([partnerId, status])
  @@index([petId])
}
```

- **PENDING**: anunciante marcou o parceiro; parceiro ainda não respondeu. Badge **não** aparece.
- **CONFIRMED**: parceiro confirmou (ou foi auto-confirmado para membro de ONG). Badge **aparece** no anúncio e em todos os lugares (feed, detalhe do pet, etc.).
- **CANCELLED**: parceiro cancelou a parceria ou rejeitou a solicitação. Badge **não** aparece.

### 2.2 Migração de `Pet.partnerId`

- **Opção A (recomendada)**: Manter `Pet.partnerId` por um tempo como “parceiro principal” legado. Na leitura do feed/detalhe, considerar:
  - Primeiro: listar parceiros de `PetPartnership` onde `status = CONFIRMED`;
  - Se vazio e `Pet.partnerId` preenchido, tratar como um único parceiro confirmado (compatibilidade).
- **Opção B**: Migração única: para todo `Pet` com `partnerId` preenchido, criar `PetPartnership(petId, partnerId, CONFIRMED, ...)`. Depois remover a coluna `partnerId` do `Pet` e usar apenas `PetPartnership` para exibir badges (um ou vários).

No restante do doc assume-se que **badge = parceiros com PetPartnership.status = CONFIRMED** (e, se existir migração legada, `Pet.partnerId` só como fallback de leitura até remoção).

---

## 3. Regras de negócio

### 3.1 Criação/edição de pet com parceiros

- **Entrada**: lista de `partnerIds` (pode ser vazia, um ou vários).
- Para cada `partnerId`:
  - Validar que o parceiro existe, está ativo e aprovado (`active: true`, `approvedAt` não nulo). Para “parceria em anúncio”, pode ser ONG ou outro tipo (CLINIC/STORE), conforme regra de produto.
  - **Se o usuário é membro daquele parceiro (ONG)**  
    (`PartnerMember` com `userId = ownerId` e `partnerId`): criar `PetPartnership` com **status CONFIRMED** e `confirmedAt = now()`, `confirmedById = ownerId`. Não criar notificação de “solicitação”.
  - **Caso contrário**: criar `PetPartnership` com **status PENDING**; disparar notificação in-app (e opcionalmente e-mail) para o parceiro (ver 3.3).
- Não permitir duplicar: `(petId, partnerId)` único (um registro por par por pet).
- Se o anunciante **remover** um parceiro da lista na edição:
  - Se existir `PetPartnership` PENDING: pode ser deletado ou marcado CANCELLED.
  - Se existir CONFIRMED: apenas o **parceiro** pode cancelar (parceiro encerra parceria no portal); o anunciante não “remove” parceiro confirmado pela UI (ou definir regra explícita: “anunciante pode remover parceria confirmada?” — sugerido: não, só o parceiro cancela).

### 3.2 Confirmação / rejeição pelo parceiro

- Apenas usuários que **administram** o parceiro (owner do parceiro ou com permissão no portal) podem confirmar ou rejeitar.
- **Confirmar**: atualizar `PetPartnership.status = CONFIRMED`, `confirmedAt = now()`, `confirmedById = userId`. Opcional: notificar o anunciante (in-app).
- **Rejeitar**: atualizar `PetPartnership.status = CANCELLED`, `cancelledAt = now()`, `cancelledById = userId`. Opcional: notificar o anunciante.

### 3.3 Notificações

- **Solicitação nova (PENDING)**  
  - Notificação in-app para o parceiro (ex.: “Fulano solicitou exibir o selo da sua ONG no anúncio do pet X. Confirme ou rejeite no portal.”).  
  - Opcional: e-mail para o e-mail do parceiro.
- **Confirmação**  
  - Notificação in-app para o anunciante: “A ONG Y aprovou a parceria no anúncio de Z.”
- **Rejeição**  
  - Notificação in-app para o anunciante: “A ONG Y não aprovou a parceria no anúncio de Z.”
- **Cancelamento pelo parceiro**  
  - Notificação in-app para o anunciante: “A ONG Y encerrou a parceria no anúncio de Z. O badge foi removido.”

### 3.4 Cancelamento pelo parceiro

- No portal do parceiro: listar pets com `PetPartnership` onde `partnerId = meu parceiro` e `status = CONFIRMED`.
- Ação “Encerrar parceria” (por pet): atualizar `PetPartnership.status = CANCELLED`, `cancelledAt = now()`, `cancelledById = userId`. Badge deixa de aparecer em todo o app (feed, detalhe, etc.). Notificar o anunciante (3.3).

### 3.5 Onde o badge aparece

- **Feed** (card do pet): exibir badge(s) apenas para parceiros com `PetPartnership.status = CONFIRMED` (e, se houver legado, `Pet.partnerId` como único quando não houver registros em PetPartnership).
- **Página de detalhe do pet**: mesmo critério.
- **Listagens por parceiro** (ex.: “Pets em parceria com a ONG X”): filtrar por `PetPartnership.partnerId = X` e `status = CONFIRMED`.

---

## 4. API

### 4.1 Criar/atualizar pet

- **POST /v1/pets**  
  - Body: incluir `partnerIds?: string[]` (em vez de ou além de `partnerId` único).  
  - Para cada id em `partnerIds`: aplicar regras 3.1 (membro ONG → CONFIRMED; senão → PENDING e notificação).

- **PATCH /v1/pets/:id**  
  - Body: `partnerIds?: string[]` (lista desejada após edição).  
  - Lógica: criar PENDING/CONFIRMED para novos; não permitir que anunciante “remova” CONFIRMED (ou definir política clara). Parceiro continua sendo o único que pode cancelar (mudar para CANCELLED).

### 4.2 Parceiros (autocomplete)

- **GET /v1/partners?type=ONG&q=termo** (ou similar)  
  - Retornar parceiros ativos/aprovados, filtrados por nome/slug com `q`, para preencher o autocomplete no último step. Suportar paginação ou limite (ex.: 20).

### 4.3 Portal do parceiro

- **GET /v1/me/partner/pet-partnership-requests**  
  - Lista de `PetPartnership` com `partnerId = parceiro do usuário` e `status = PENDING`. Incluir dados mínimos do pet (nome, foto, id) e do solicitante (nome) para exibir no portal.

- **POST /v1/me/partner/pet-partnership-requests/:id/confirm**  
  - Confirma a solicitação (id = PetPartnership.id). Atualiza para CONFIRMED e notifica o anunciante.

- **POST /v1/me/partner/pet-partnership-requests/:id/reject**  
  - Rejeita (CANCELLED) e notifica o anunciante.

- **GET /v1/me/partner/pet-partnerships**  
  - Lista de pets com parceria CONFIRMED com o meu parceiro (para o parceiro ver “anúncios em parceria” e poder cancelar).

- **POST /v1/me/partner/pet-partnerships/:id/cancel**  
  - Parceiro encerra a parceria (status → CANCELLED). Badge removido; notificar anunciante.

---

## 5. Mobile (app)

### 5.1 Último step (Publicar) – Novo anúncio e edição

- **Remover**: chips com lista de todos os parceiros.
- **Incluir**:
  - Campo de busca com autocomplete: ao digitar, chamar `GET /v1/partners?type=ONG&q=...` (e tipos permitidos, se houver).
  - Exibir resultados em lista; ao tocar, adicionar o parceiro à seleção (multi-select).
  - Exibir lista de parceiros já selecionados (com opção de remover apenas os que ainda estão PENDING; CONFIRMED não removível pelo anunciante, se regra for essa).
- **Envio**: ao publicar (ou salvar rascunho), enviar `partnerIds: string[]` com os ids selecionados. Backend aplica regras (membro ONG → CONFIRMED; demais → PENDING).

### 5.2 Pré-preenchimento para membro de ONG

- Se o usuário tem `partnerMemberships` (membro de uma ou mais ONGs), no último step pode-se sugerir ou pré-selecionar a primeira ONG (como hoje), mas a seleção final continua sendo pela busca + multi-select. Ao enviar, backend detecta membro e confirma automaticamente para essa ONG.

### 5.3 Portal do parceiro

- **Nova seção: “Solicitações de parceria”**  
  - Lista de `PetPartnership` PENDING do meu parceiro (GET pet-partnership-requests).  
  - Cada item: nome do pet, foto, nome do anunciante, botões “Aprovar” e “Rejeitar”.  
  - Badge de quantidade (ex.: “3 pendentes”) no menu/portal.

- **Nova seção: “Anúncios em parceria”**  
  - Lista de pets com CONFIRMED (GET pet-partnerships).  
  - Cada item: link para o pet, botão “Encerrar parceria” (chama cancel).  
  - Ao encerrar: badge removido do anúncio e em todo o app.

### 5.4 Feed e detalhe do pet

- Consumir da API a lista de parceiros confirmados (a partir de `PetPartnership` com status CONFIRMED; ou `partner` único se ainda em modo legado).  
- Exibir um badge por parceiro (ou um badge “Em parceria com X, Y” conforme design).

---

## 6. Pontos adicionais (robustez)

- **Idempotência**: ao criar pet com os mesmos `partnerIds` já existentes (ex.: reenvio), não duplicar `PetPartnership` (usar `@@unique([petId, partnerId])` e upsert ou ignorar duplicata).
- **Limite de parceiros por pet**: definir um máximo (ex.: 3 ou 5) para evitar abuso e UI poluída.
- **Tipos de parceiro**: hoje a API de create pet valida só ONG; definir se CLINIC/STORE também podem ser parceiros de anúncio. Se sim, estender validação em create/update.
- **Auditoria**: `requestedById`, `confirmedById`, `cancelledById` e datas permitem rastrear quem aprovou/rejeitou/cancelou.
- **Notificações in-app**: usar o mesmo sistema já existente (ex.: tabela de notificações + push). Criar tipos como `PET_PARTNERSHIP_REQUEST`, `PET_PARTNERSHIP_CONFIRMED`, `PET_PARTNERSHIP_REJECTED`, `PET_PARTNERSHIP_CANCELLED_BY_PARTNER`.
- **E-mail**: opcional enviar e-mail ao parceiro quando houver nova solicitação PENDING (para não depender só do app).
- **Listagem “Pets em parceria com X”**: já existe ou pode usar `GET /pets/by-partner/:partnerId` filtrando por `PetPartnership` CONFIRMED em vez de (ou além de) `Pet.partnerId`.

---

## 7. Ordem sugerida de implementação

1. **Schema**: criar modelo `PetPartnership` e migration; migrar dados de `Pet.partnerId` para `PetPartnership` CONFIRMED (e depois opcionalmente remover coluna).
2. **API**:  
   - Ajustar create/update pet para aceitar `partnerIds[]` e criar PetPartnership (PENDING ou CONFIRMED conforme membro ONG).  
   - Endpoints do portal: listar pendentes, confirmar, rejeitar, listar confirmados, cancelar.
3. **Notificações**: criar tipos e envio para solicitação, confirmação, rejeição e cancelamento.
4. **API feed/detalhe**: passar a montar lista de parceiros a partir de PetPartnership CONFIRMED (e legado se necessário).
5. **Mobile – Add/Edit pet**: trocar chips por busca + autocomplete, multi-select, enviar `partnerIds[]`.
6. **Mobile – Portal**: seções “Solicitações de parceria” e “Anúncios em parceria” com ações descritas.
7. **Mobile – Feed/Detalhe**: exibir um ou vários badges conforme parceiros confirmados.
8. **Testes**: criar/editar pet com e sem parceiros; membro ONG (auto-confirm); parceiro confirma/rejeita/cancela; verificar badges e notificações.

---

## 8. Resumo

| Ação | Quem | Resultado |
|------|------|-----------|
| Anunciante marca parceiro(s) no último step | App (busca + multi-select) | PetPartnership PENDING ou CONFIRMED (se membro ONG) |
| Parceiro aprova no portal | Portal | PENDING → CONFIRMED; badge aparece |
| Parceiro rejeita no portal | Portal | PENDING → CANCELLED; sem badge |
| Parceiro encerra parceria | Portal | CONFIRMED → CANCELLED; badge removido |
| Membro de ONG anuncia e marca sua ONG | Backend | CONFIRMED direto; sem solicitação no portal |

Documento de referência para implementação da engine. Qualquer dúvida ou ajuste de regra pode ser refletido neste arquivo antes de codar.
