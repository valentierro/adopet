# Sugestões: adoção, verificação e anúncios (robustez e confiança)

Sugestões para fortalecer o fluxo de adoção, a verificação de pets/usuários e a moderação de anúncios, aumentando transparência e confiança no app.

---

## 1. Fluxo de adoção

### 1.1 Motivo quando a Adopet rejeita a marcação de adoção
**Problema:** O tutor vê apenas o badge "Rejeitado pelo Adopet", sem saber o motivo.  
**Sugestão:** No admin, ao rejeitar a marcação, permitir um **motivo opcional** (ex.: "Adotante não encontrado na lista de conversas", "Dados inconsistentes"). Salvar em algo como `adoptionRejectionReason` (ou em uma tabela de feedback). No app, em "Meus anúncios", exibir um texto do tipo: *"Rejeitado pelo Adopet: [motivo]. Você pode marcar como adotado novamente indicando o adotante correto."*  
**Benefício:** O tutor entende o que ajustar e evita repetir o mesmo erro; reduz suporte e sensação de arbitrariedade.

### 1.2 Notificar o adotante quando for indicado
**Problema:** O tutor indica quem adotou (conversa ou @username), mas o adotante pode não saber que precisa confirmar no app.  
**Sugestão:** Quando o tutor marcar como adotado e indicar um adotante, enviar **push (e opcionalmente e-mail)** ao adotante: *"O tutor de [pet] indicou você como adotante. Confirme no app para que a adoção seja validada."* com deep link para a tela de confirmação (ou "Minhas adoções" / conversa de confirmação).  
**Benefício:** Aumenta a taxa de confirmação pelo adotante e de conclusão do fluxo em 48h.

### 1.3 Explicar o fluxo na hora de marcar como adotado
**Problema:** O tutor pode não saber que, ao indicar um adotante, essa pessoa precisa confirmar e que a Adopet pode validar em até 48h.  
**Sugestão:** No modal de "Marcar como adotado" (e na tela de edição do pet), incluir um texto curto: *"Se você indicar quem adotou, essa pessoa receberá um pedido de confirmação no app. Após a confirmação, a Adopet valida em até 48h e sua pontuação será atualizada."*  
**Benefício:** Expectativa alinhada; menos dúvidas e menos sensação de "nada aconteceu" após marcar.

### 1.4 Histórico de adoções no perfil do tutor
**Problema:** Quem vê o perfil do tutor não enxerga quantos pets ele já colocou para adoção com sucesso.  
**Sugestão:** Na API do perfil do tutor (owner), já existe ou pode existir um contador de adoções confirmadas; no app, no detalhe do pet ou no perfil do tutor, exibir algo como *"X adoções realizadas"* ou *"Tutor com X adoções confirmadas"*. Reaproveitar o que já existe em `tutorStats` (nível, pontos).  
**Benefício:** Mais confiança para quem está pensando em adotar: tutor com histórico visível transmite mais credibilidade.

---

## 2. Verificação de pets e usuários

### 2.1 Motivo quando a verificação é rejeitada
**Problema:** O usuário solicita verificação (perfil ou pet); o admin rejeita; o status muda para REJECTED sem explicação.  
**Sugestão:** No painel admin, ao rejeitar uma solicitação de verificação, permitir um **motivo opcional** (ex.: "Foto do pet não confere com o anúncio", "Documento não legível"). Persistir em `Verification.rejectionReason` (ou campo similar). No app, em Perfil ou em "Meus anúncios" (para pet), exibir: *"Solicitação de verificação não aprovada: [motivo]. Você pode solicitar novamente após ajustes."*  
**Benefício:** O usuário sabe o que corrigir; menos tentativas aleatórias e mais confiança no processo.

### 2.2 Uma solicitação de verificação por pet/usuário por vez
**Problema:** O usuário pode abrir várias solicitações PENDING para o mesmo pet ou para o perfil, poluindo a fila do admin.  
**Sugestão:** Na API de `request` de verificação, antes de criar nova: se já existir uma com `status: 'PENDING'` para o mesmo `userId` e (no caso de PET_VERIFIED) mesmo `petId`, retornar erro amigável: *"Você já tem uma solicitação de verificação em análise para este pet/perfil. Aguarde a resposta antes de solicitar novamente."*  
**Benefício:** Fila admin mais limpa; usuário não fica em dúvida sobre "qual solicitação vale".

### 2.3 Notificar quando a verificação for aprovada ou rejeitada
**Problema:** O usuário solicita verificação e não recebe aviso quando o admin decide.  
**Sugestão:** Quando o admin aprovar ou rejeitar (e, no caso de rejeição, ao ter motivo): enviar **push** (e opcionalmente e-mail): *"Sua verificação de [perfil/pet X] foi aprovada!"* ou *"Sua solicitação de verificação não foi aprovada: [motivo]. Você pode solicitar novamente."*  
**Benefício:** Fechamento do ciclo; usuário não precisa ficar checando o app para ver o status.

---

## 3. Anúncios (moderação e vida útil)

### 3.1 Motivo quando o anúncio é rejeitado na moderação
**Problema:** O tutor vê "Rejeitado" em "Meus anúncios" sem saber por quê.  
**Sugestão:** No admin, ao rejeitar um anúncio (set publication REJECTED), permitir um **motivo opcional** (ex.: "Foto inadequada", "Descrição genérica demais"). Salvar em algo como `publicationRejectionReason` no pet (ou em tabela de feedback). No app, no card do pet em "Meus anúncios", quando `publicationStatus === 'REJECTED'`, exibir: *"Anúncio não aprovado: [motivo]. Edite e envie novamente para análise."*  
**Benefício:** Tutor sabe o que mudar; menos rejeições repetidas e mais sensação de processo justo.

### 3.2 Reenviar para análise após edição
**Problema:** Após rejeição, o tutor edita o pet mas pode não saber que precisa "reenviar para moderação" ou o sistema pode não ter um estado "pendente novamente".  
**Sugestão:** Se houver `publicationRejectionReason` (ou equivalente), ao salvar a edição do pet, permitir **voltar o status de publicação para PENDING** (ex.: botão "Enviar novamente para análise"). Garantir na API que um pet REJECTED possa passar a PENDING novamente ao ser editado e submetido. No app, botão claro: *"Enviar novamente para análise"*.  
**Benefício:** Fluxo explícito; tutor não fica achando que só editar já reativa o anúncio.

### 3.3 Destaque para anúncio "Em análise" e "Rejeitado"
**Problema:** Em "Meus anúncios", todos os cards podem parecer iguais; "Em análise" e "Rejeitado" precisam de destaque visual.  
**Sugestão:** Já existe badge de status; reforçar com cor/ícone: por exemplo, "Em análise" em amarelo/laranja com ícone de relógio; "Rejeitado" em vermelho com ícone de aviso e, se houver, o motivo (ver 3.1). Texto curto de ação: "Enviar novamente para análise" quando rejeitado.  
**Benefício:** Menor chance de o tutor ignorar anúncios que precisam de ação.

### 3.4 Prorrogação e expiração
**Problema:** O pet já tem `expiresAt`, lembretes em 10/5/1 dia e mensagem de sistema quando expira. Falta garantir que o tutor veja de forma muito clara que o anúncio vai expirar e como prorrogar.  
**Sugestão:** No detalhe/edição do pet em "Meus anúncios", se `expiresAt` existir, exibir: *"Este anúncio expira em [data]. Toque aqui para prorrogar por 60 dias."* (link para o endpoint de prorrogação). Na lista, um badge "Expira em X dias" quando restarem ≤ 5 dias.  
**Benefício:** Menos anúncios que caem do feed por esquecimento; tutores mais conscientes da vida útil do anúncio.

---

## 4. Confiança e transparência (geral)

### 4.1 O que significa "Verificado" no pet e no perfil
**Problema:** Usuários podem não saber o que o selo "Verificado" significa.  
**Sugestão:** Em algum lugar acessível (ex.: primeira vez que vê um pet verificada, tooltip ou tela "O que é verificação?" no Perfil): *"Pets e perfis verificados passaram por análise da equipe Adopet. Isso não substitui o encontro responsável com o tutor."*  
**Benefício:** Aumenta o valor percebido do selo e reduz expectativas equivocadas.

### 4.2 Diferença entre "Confirmado pelo Adopet" e só "Adotado"
**Problema:** O tutor vê "Adotado" e depois "Confirmado pelo Adopet"; pode não entender a diferença.  
**Sugestão:** Em "Meus anúncios", quando o pet está adotado: se `confirmedByAdopet`, manter o badge verde "Confirmado pelo Adopet"; caso contrário (aguardando validação), texto: *"Aguardando confirmação da Adopet (até 48h após o adotante confirmar)."* Assim fica claro que há duas etapas: tutor marca + adotante confirma → depois a Adopet valida.  
**Benefício:** Menos confusão e menos perguntas sobre pontuação/estado do anúncio.

### 4.3 Registro de ações sensíveis (auditoria)
**Problema:** Para casos de disputa ou abuso, não há histórico de quem aprovou/rejeitou e quando.  
**Sugestão:** (Médio prazo) Registrar em log ou tabela de auditoria: aprovação/rejeição de anúncio, aprovação/rejeição de verificação, confirmação/rejeição de adoção pelo admin (admin userId, timestamp, id do recurso, motivo se houver). Não precisa vir para o app; serve para suporte e moderação.  
**Benefício:** Rastreabilidade e responsabilidade; ajuda em políticas e suporte.

---

## 5. Priorização sugerida

| Prioridade | Item | Esforço | Impacto |
|------------|------|---------|---------|
| Alta | 3.1 Motivo ao rejeitar anúncio | Médio (API + admin + app) | Alto – tutor sabe o que corrigir |
| Alta | 2.1 Motivo ao rejeitar verificação | Médio (API + admin + app) | Alto – mesmo benefício |
| Alta | 1.1 Motivo ao rejeitar marcação de adoção | Médio (API + admin + app) | Alto – tutor entende a rejeição |
| Média | 1.2 Notificar adotante quando indicado | Baixo (push + deep link) | Alto – mais confirmações |
| Média | 2.3 Notificar ao aprovar/rejeitar verificação | Baixo (push) | Médio – fechamento do ciclo |
| Média | 1.3 Explicar fluxo ao marcar como adotado | Baixo (texto no app) | Médio – expectativa clara |
| Média | 3.2 Reenviar para análise após edição | Baixo a médio (API + app) | Médio – fluxo explícito |
| Média | 2.2 Uma solicitação PENDING por pet/usuário | Baixo (API) | Médio – fila mais limpa |
| Baixa | 3.3 Destaque Em análise / Rejeitado | Baixo (UI) | Médio – visibilidade |
| Baixa | 3.4 Prorrogação visível | Baixo (UI + endpoint já existe) | Médio – menos expirações por esquecimento |
| Baixa | 1.4 Histórico de adoções no perfil | Baixo (já existe em tutorStats) | Médio – confiança |
| Baixa | 4.1 e 4.2 Textos explicativos | Baixo (copy no app) | Confiança e transparência |
| Futuro | 4.3 Auditoria | Médio | Suporte e moderação |

---

Este documento pode ser usado para priorizar sprints e alinhar produto e desenvolvimento em adoção, verificação e anúncios.
