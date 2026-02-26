# Fluxo de adoção de um pet

Este documento descreve como um pet passa a ser considerado **adotado** no Adopet e o que acontece no app.

> **Há dois fluxos de adoção:** (1) tutor marca como adotado manualmente em "Meus anúncios" (este doc); (2) fluxo via chat com confirmação do adotante, checklist e KYC — ver [Fluxos do app](flows.md#fluxo-de-adoção-via-chat).

## Visão geral

A adoção pode ser **registrada manualmente pelo tutor** em "Meus anúncios" → Editar → Status "Adotado". Ou pelo fluxo via chat, em que o tutor confirma a adoção para alguém na conversa e o adotante aceita o termo (e faz KYC se necessário).

## Passo a passo

1. **Tutor anuncia o pet**  
   Cadastra o pet em "Anunciar pet". O anúncio vai para moderação e, após aprovação, aparece no feed e no mapa com status **Disponível**.

2. **Interessados entram em contato**  
   Usuários veem o pet no feed, podem favoritar e abrir conversa com o tutor. A combinação (entrega, visita, etc.) ocorre fora do app.

3. **Tutor marca o pet como adotado**  
   Quando a adoção se concretiza:
   - O tutor abre **Meus anúncios** → toca no pet → **Editar anúncio**.
   - Na seção **Status do anúncio**, escolhe **Adotado**.
   - O app pede confirmação: *"Marcar como adotado? O anúncio sairá do feed e do mapa."*
   - Após confirmar, a API atualiza o pet com `status: 'ADOPTED'` (PATCH `/pets/:id/status`).

4. **Efeitos no sistema**
   - **Feed e mapa**: só exibem pets com `status: 'AVAILABLE'`. O pet adotado deixa de aparecer.
   - **Meus anúncios**: o pet continua na lista do tutor, com status "Adotado".
   - **Pontuação do tutor**: o tutor ganha pontos de reconhecimento (sistema de níveis), pois a adoção conta para o cálculo.
   - **Quem acessar o link direto** (`/pet/:id`): ainda vê a ficha do pet, com um aviso de que o pet já foi adotado.

## API

- **Alterar status do pet** (apenas dono): `PATCH /pets/:id/status` com body `{ "status": "ADOPTED" }` (ou `"AVAILABLE"`, `"IN_PROCESS"`).
- **Feed**: `GET /feed` — filtro interno `status: 'AVAILABLE'` e `publicationStatus: 'APPROVED'`.
- **Mapa**: `GET /feed/map` — mesmo filtro; apenas pets disponíveis e aprovados aparecem nos pins.

## Possíveis evoluções

- Permitir que o **adotante** confirme a adoção (ex.: botão "Fui adotado por este tutor") e o tutor só aprove.
- Notificar o tutor quando alguém inicia conversa ou favorita o pet.
- Histórico de adoções no perfil do tutor (pets já adotados).
