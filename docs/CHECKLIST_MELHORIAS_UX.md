# Checklist: melhorias de UX e políticas (Adopet)

Documento de referência das informações sobre **não comercialização**, **pins**, e das sugestões de melhoria acordadas. Use para não esquecer e para priorizar próximas entregas.

---

## 1. Informações sobre adoção voluntária e não comercialização

**Status: implementado**

- **Chat (tela da conversa):** texto “Adoção responsável, voluntária e sem custos” e bullet “Não é permitida a comercialização de animais no Adopet — a adoção é voluntária e sem custos.” (`apps/mobile/app/(tabs)/chat/[id].tsx`).
- **Lista de conversas:** aviso “Adoção no Adopet é voluntária e sem custos.” (`chats.tsx`).
- **Onboarding:** “Toda adoção no Adopet é voluntária e sem custos — não incentivamos a comercialização de animais.” (`onboarding/index.tsx`).
- **Welcome:** “Adoção voluntária e sem custos. O Adopet não incentiva a comercialização de animais.” (`welcome.tsx`).
- **Feed:** “Adoção responsável, voluntária e sem custos.” (`feed.tsx`).
- **Termos de Uso:** seção “Adoção voluntária e sem custos” e texto sobre não comercialização (`terms.tsx`).
- **Landing / parceiros:** mensagens alinhadas (sem custo, parceria gratuita).

---

## 2. Pins no mapa

**Status: implementado**

- Pins dos pets no mapa com raio conforme Preferências.
- Correções de exibição dos pins (release notes 1.0.4, 1.0.5, 1.0.6, 1.0.20).
- Filtro de espécie (Cachorro/Gato/Todos) no mapa (`map.tsx`: `SPECIES_OPTIONS`, `speciesFilter`, `fetchFeedMap` com `species`).

---

## 3. Lembrete na primeira conversa

**Status: implementado**

- Toast ou mensagem automática **uma vez por conversa**: “Lembrete: adoção no Adopet é voluntária e sem custos.” na primeira mensagem da conversa (`chat/[id].tsx`: `reminderToast`, lógica com `hasShownReminder` / primeira vez).

---

## 4. Notificação pós-adoção (“Como foi a adoção?”)

**Status: parcial**

- **Backend (pronto):** o job envia push 3–4 dias após a confirmação da adoção, com título “Como foi a adoção?” e corpo “Conte sua experiência com a adoção de {pet}. Sua opinião nos ajuda a melhorar.” O payload inclui `data: { screen: 'my-adoptions' }` para o app abrir Minhas adoções ao toque (`notifications-jobs.service.ts`).
- **Por que parcial:** (1) No app, o hook de notificação só tratava `conversationId` (abrir chat); não tratava `screen: 'my-adoptions'`, então ao tocar na notificação o usuário não era levado a Minhas adoções. (2) A sugestão original era “com link para avaliação ou feedback opcional” — não existe ainda tela de NPS/avaliação nem link para pesquisa; o push só leva (ou passará a levar) à lista de adoções.
- **O que falta para “completo”:** tratar o payload `screen: 'my-adoptions'` no app (ver abaixo) e, opcionalmente, no futuro: tela ou link de NPS/feedback ao tocar nessa notificação.

---

## 5. Buscas salvas e notificações “novos pets na região”

**Status: implementado (revisar se notificações estão ativas e claras)**

- Buscas salvas existem (CRUD no app e API).
- Em **Preferências:** toggle “Quando surgirem pets novos no raio e na espécie configurados” e textos “Mensagens e conversas”, “Lembretes de conversas” (`preferences.tsx`).
- **Ação:** garantir que o job de notificação de “novos pets na sua região” está ativo no backend e que o texto nas Preferências deixa claro que isso inclui buscas salvas / alertas por região.

---

## 6. Filtros no mapa (espécie)

**Status: implementado**

- Mesmo conceito do feed: chips **Todos / Cachorros / Gatos** no mapa (`map.tsx`, `SPECIES_OPTIONS`, `speciesFilter`).

---

## 7. Empty state no mapa

**Status: implementado**

- Quando `items.length === 0` e não está loading: mensagem “Nenhum pet no raio de X km. Aumente o raio em Preferências ou volte mais tarde.” e botão “Abrir Preferências” (`map.tsx`: `showEmptyState`, `emptyOverlay`).

---

## 8. Pull-to-refresh no mapa

**Status: implementado**

- `ScrollView` com `RefreshControl` que chama `refetch()` dos pins (`map.tsx`). Botão “Atualizar” também disponível no footer.

---

## 9. Deep link “Apoiar o Adopet”

**Status: implementado**

- No Perfil, item “Apoiar o Adopet” abre `DONATION_URL` (`https://www.appadopet.com.br/apoie`) via `Linking.openURL` (`profile.tsx`). No futuro: mesma URL pode ter deep link de volta ao app após doação (opcional).

---

## 10. Versão nas configurações

**Status: implementado**

- Em Perfil (rodapé do menu): “Adopet v{versão}” usando `Constants.expoConfig?.version` (`profile.tsx`). Facilita suporte e bug reports.

---

## Resumo rápido

| Item                               | Status      | Observação                          |
|------------------------------------|------------|-------------------------------------|
| Não comercialização / textos       | Implementado | Vários pontos do app e termos       |
| Pins no mapa                       | Implementado | Raio e espécie                      |
| Lembrete 1ª conversa               | Implementado | Toast uma vez por conversa         |
| Notificação pós-adoção            | Parcial     | Backend ok; app passa a abrir Minhas adoções ao toque; falta NPS/feedback opcional |
| Buscas salvas + notificações       | Implementado | Revisar clareza e job ativo         |
| Filtro espécie no mapa             | Implementado | Chips Todos/Cachorro/Gato           |
| Empty state mapa                   | Implementado | Mensagem + Abrir Preferências       |
| Pull-to-refresh mapa               | Implementado | RefreshControl + botão Atualizar    |
| Deep link Apoiar o Adopet          | Implementado | Abre URL de apoio/doação            |
| Versão no perfil                   | Implementado | “Adopet vX.X.XX”                    |

---

*Última atualização: fev/2026.*
