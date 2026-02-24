# Follow-up para tutores com anúncios ativos

Proposta de mensagens periódicas para quem tem pet cadastrado, incentivando a manter anúncios atualizados e a marcar como adotado quando aplicável.

---

## 1. Objetivo

- Reduzir anúncios “fantasma” (pet já adotado fora do app ou em andamento, mas não atualizado).
- Aumentar a taxa de adoções **registradas** na plataforma (tutor marca como adotado → confirmação → pontuação).
- Reforçar o uso da gamificação (nível/título do tutor) como incentivo positivo.

---

## 2. Público-alvo

- Usuários que têm **pelo menos um pet** com status **Disponível** ou **Em andamento** (anúncios ativos).
- Não enviar para quem só tem pets já **Adotados** (não há nada a atualizar).

---

## 3. Periodicidade

- **Sugestão:** a cada **30 dias** (evita cansaço; 20 dias é possível se quiser mais frequência).
- Só enviar se já tiver passado X dias desde o **último** lembrete desse tipo (evitar duplicata se o job rodar mais de uma vez por dia).

---

## 4. Canal

- **Push notification** (como os lembretes de conversa e “novos pets”).
- **Opcional depois:** banner ou card **dentro do app** na tela “Meus anúncios” (ex.: “Se algum pet já foi adotado, atualize o status para manter seu perfil em dia e sua pontuação correta.”). Pode ser exibido só para quem não atualizou há Y dias.

---

## 5. Conteúdo da mensagem

### 5.1 Foco em atualização + adoção na plataforma

**Exemplo (push):**

- **Título:** `Seus anúncios estão em dia?`
- **Corpo:** `Confira se algum pet já foi adotado e atualize na plataforma. Anúncios atualizados ajudam mais pets a encontrar lar.`

**Variação mais curta:**

- **Título:** `Atualize seus anúncios`
- **Corpo:** `Algum pet já foi adotado? Marque como adotado no app para manter seu perfil e sua pontuação em dia.`

### 5.2 Incluindo gamificação (recomendado)

- Reforçar que **atualizar** (especialmente marcar como adotado quando for o caso) é o que permite **confirmar a adoção** e **somar pontos**.
- Opcional: personalizar com o **título/nível** do tutor (ex.: “Tutor Ativo”, “Tutor Destaque”) para dar sensação de progresso.

**Exemplos com gamificação:**

- **Título:** `Tutor, seus anúncios estão em dia?`
- **Corpo:** `Se algum pet já foi adotado, atualize no app. Adoções confirmadas entram na sua pontuação e no seu nível de tutor.`

Ou, com número de pets (se quiser personalizar no backend):

- **Corpo:** `Você tem X pet(s) anunciado(s). Se algum já foi adotado, atualize no app — sua pontuação e seu nível de tutor refletem as adoções confirmadas.`

---

## 6. Respeito ao usuário e controle

- **Preferência de notificação:** adicionar algo como `notifyListingReminders` em **Preferências** (ex.: “Lembretes para atualizar anúncios”), **default true**. Quem desligar não recebe mais esse follow-up.
- **Cooldown:** não enviar de novo antes de 20 ou 30 dias (conforme a periodicidade escolhida).
- **Só quem tem anúncio ativo:** apenas tutores com pelo menos um pet AVAILABLE ou IN_PROCESS.
- **Push token:** só enviar se o usuário tiver `pushToken` (como nos outros jobs).

---

## 7. Rastreamento (quando enviou o último lembrete)

- **Opção A:** campo `lastListingReminderAt` no modelo **User** (ou em **UserPreferences**).
- **Opção B:** tabela `TutorListingReminder { userId, lastSentAt }` (útil se no futuro houver mais de um tipo de lembrete para tutores).
- **Recomendação:** começar com um campo em **User** ou **UserPreferences** (ex.: `lastListingReminderAt`) para não criar tabela nova; migrar para tabela só se precisar de histórico ou vários tipos.

---

## 8. Esboço técnico (API)

- **Onde:** mesmo serviço de jobs de notificação (`NotificationsJobsService`).
- **Novo job:** por exemplo `runTutorListingReminderJob()`.
- **Intervalo de execução:** por exemplo 1x por dia (como os outros), e **dentro do job** filtrar por “último lembrete há ≥ 30 dias”.
- **Lógica resumida:**
  1. Buscar usuários que têm pelo menos um pet com `status IN ('AVAILABLE','IN_PROCESS')`, `pushToken` não nulo e (se existir) `notifyListingReminders !== false`.
  2. Para cada um, checar `lastListingReminderAt` (ou equivalente): se for null ou &lt; (now - 30 dias), enviar push e atualizar `lastListingReminderAt`.
- **Payload do push:** `data: { screen: 'my-pets' }` (ou similar) para abrir direto em “Meus anúncios” no app.

---

## 9. Mobile (app)

- **Preferências:** nova opção “Lembretes para atualizar anúncios” (ligada/desligada), persistida em `UserPreferences.notifyListingReminders` (quando o campo existir na API).
- **Deep link:** ao tocar na notificação, abrir a tela “Meus anúncios” (já existe; só mapear o `data.screen` no handler de push).

---

## 10. Resumo de decisões

| Item | Sugestão |
|------|----------|
| Periodicidade | 30 dias |
| Canal | Push (e depois, opcional, banner in-app em “Meus anúncios”) |
| Gamificação | Sim: mencionar pontuação e nível de tutor na mensagem |
| Preferência | notifyListingReminders (default true) |
| Onde rastrear último envio | User.lastListingReminderAt ou UserPreferences.lastListingReminderAt |
| Job | runTutorListingReminderJob, 1x/dia, filtrar por cooldown 30 dias |

Se quiser, o próximo passo é implementar na API (campo + job + push) e depois a preferência e o deep link no app.
