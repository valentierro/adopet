# Onboarding em bottom sheet — sugestão final (estilo Trivago)

Bottom sheet com slides na **primeira abertura do app como visitante**, antes ou no lugar do sheet atual de boas-vindas. Inclui: apresentação do app, como funciona, permissões (localização, fotos, notificações) e fechamento com login/cadastro/explorar.

---

## Regras gerais

- **Quando mostrar:** primeira vez que o visitante abre o feed (flag persistida, ex.: `@adopet/onboarding_slides_seen`).
- **Dispensar:** gesto de arrastar para baixo ou botão "Pular" (marca como visto e não mostra de novo).
- **Um pedido de permissão por slide:** não juntar localização + fotos + notificações no mesmo popup do sistema.
- **Respeitar "Agora não":** não insistir na mesma sessão; permitir pedir de novo em contexto (ex.: fotos ao criar anúncio, notificações nas configurações).

---

## Slide 1 — Logo + sobre o Adopet

**Objetivo:** Apresentar a marca e o propósito em uma frase.

**Conteúdo:**
- **Logo:** logo Adopet (splash ou horizontal), centralizada.
- **Título:** "Bem-vindo ao Adopet"
- **Texto (2–3 linhas):**  
  "Conectamos quem quer adotar a pets que precisam de um lar. Adoção voluntária, sem custos e com transparência."
- **CTA:** botão "Continuar" (avança para o slide 2).

**Visual:** Fundo do sheet em cor de superfície (surface); texto em cor primária/secundária do tema. Sem pedido de permissão neste slide.

---

## Slide 2 — Como funciona o app

**Objetivo:** Explicar em poucos pontos como o app funciona (estilo Trivago: “assim funciona a Trivago”).

**Conteúdo:**
- **Título:** "Como funciona"
- **Texto (bullets ou frases curtas):**
  - Descubra pets na sua região (feed e mapa).
  - Curta os que combinaram com você e converse com o tutor.
  - Anuncie pets para adoção com fotos e preferências.
  - Adoção responsável: verificação e acompanhamento.
- **CTA:** botão "Continuar" (avança para o slide 3).

**Visual:** Ícone opcional (ex.: patinha ou lista). Mesmo estilo do slide 1.

---

## Slide 3 — Localização

**Objetivo:** Pedir permissão de localização com contexto claro.

**Conteúdo:**
- **Ícone:** mapa ou pin de localização.
- **Título:** "Pets perto de você"
- **Texto:**  
  "Com sua localização, mostramos anúncios na sua região. Você pode alterar o raio nas preferências."
- **CTA principal:** "Permitir localização" → dispara o pedido do sistema (iOS/Android). Se já concedida, avança.
- **Link secundário:** "Agora não" (avança sem pedir de novo nesta sessão).

**Comportamento:** Ao tocar em "Permitir localização", chamar a API de permissão (ex.: `expo-location.requestForegroundPermissionsAsync`); em seguida avançar para o próximo slide (ou fechar, se for o último de permissões).

---

## Slide 4 — Notificações

**Objetivo:** Explicar o benefício e pedir permissão para notificações push.

**Conteúdo:**
- **Ícone:** sino ou campainha.
- **Título:** "Fique por dentro"
- **Texto:**  
  "Ative as notificações para receber novidades sobre pets, mensagens dos tutores e lembretes que ajudam na adoção."
- **CTA principal:** "Ativar notificações" → pede permissão push (ex.: `expo-notifications.requestPermissionsAsync`). Se já concedida, avança.
- **Link secundário:** "Agora não" (avança sem pedir).

**Comportamento:** Mesmo padrão do slide de localização: um toque = um pedido; "Agora não" só avança.

---

## Slide 5 — Fotos (opcional, para quem vai anunciar)

**Objetivo:** Explicar que fotos são usadas para anunciar pets; o pedido de permissão de mídia pode ser feito aqui ou só ao criar o primeiro anúncio.

**Conteúdo:**
- **Ícone:** câmera ou galeria.
- **Título:** "Fotos do seu pet"
- **Texto:**  
  "Para anunciar um pet para adoção, você envia fotos da galeria. O acesso é usado só quando você escolher as fotos do anúncio."
- **CTA principal:** "Entendi" (só avança; o pedido de mídia fica para quando for criar anúncio).  
  **Ou:** "Permitir acesso às fotos" (pede já e depois avança).
- **Link secundário (se pedir aqui):** "Agora não".

**Sugestão:** Manter este slide mais informativo ("Entendi") e pedir permissão de mídia no fluxo de "Anunciar pet", para não sobrecarregar o onboarding.

---

## Slide final — Entrar, criar conta ou explorar

**Objetivo:** Fechar o onboarding com as ações principais (como no sheet atual de boas-vindas).

**Conteúdo:**
- **Título:** "Pronto para começar?"
- **Texto opcional:** "Entre na sua conta, crie uma nova ou explore os pets sem cadastro."
- **CTAs:**
  - Botão primário: **"Entrar"** → fecha o sheet e navega para a tela de login.
  - Botão secundário: **"Criar conta"** → fecha o sheet e navega para a tela de cadastro.
  - Link/texto: **"Explorar sem conta"** → persiste a flag de onboarding visto, fecha o sheet e permanece no feed como visitante.

**Comportamento:** Ao escolher qualquer opção, marcar `@adopet/onboarding_slides_seen` (ou equivalente) para não exibir o onboarding de slides de novo.

---

## Ordem sugerida dos slides

| # | Slide              | Conteúdo resumido                          |
|---|--------------------|--------------------------------------------|
| 1 | Logo + sobre       | Bem-vindo, texto sobre o Adopet, Continuar |
| 2 | Como funciona      | Bullets de como funciona o app, Continuar  |
| 3 | Localização        | Pets perto de você, Permitir / Agora não   |
| 4 | Notificações       | Fique por dentro, Ativar / Agora não       |
| 5 | Fotos (opcional)   | Fotos do pet, Entendi (ou Permitir)        |
| 6 | Final              | Entrar, Criar conta, Explorar sem conta    |

**Versão enxuta (4 slides):** 1) Logo + sobre → 2) Como funciona → 3) Localização → 4) Notificações + no mesmo slide o bloco "Pronto para começar?" com Entrar / Criar conta / Explorar.  
Assim o último slide junta “ativar notificações” e “decidir conta”.

**Versão completa (6 slides):** como na tabela, com slide de Fotos e slide final só de CTAs.

---

## Integração com o fluxo atual

- **Sheet atual de boas-vindas** (logo + Entrar / Criar conta / Explorar sem conta): pode ser **substituído** por este onboarding com slides na primeira vez; nas próximas vezes, se já tiver visto os slides, não mostra nem o sheet antigo nem o novo (visitante vai direto ao feed).
- **Primeira abertura (visitante):** mostrar o bottom sheet com os slides (1 → 2 → 3 → 4 → [5] → final). Ao terminar ou "Pular", setar flag e não mostrar de novo.
- **Permissões:** localização e notificações pedidas nos respectivos slides; fotos opcional no onboarding ou só no "Anunciar pet".

---

## Resumo visual (wireframe em texto)

```
┌─────────────────────────────────────┐
│  [  —  ]  (handle)                   │
│                                     │
│         [Logo Adopet]               │
│                                     │
│     Bem-vindo ao Adopet             │
│                                     │
│  Conectamos quem quer adotar a      │
│  pets que precisam de um lar.       │
│  Adoção voluntária, sem custos.    │
│                                     │
│     [  Continuar  ]                 │
│                                     │
│         ● ○ ○ ○ ○   (indicador)     │
└─────────────────────────────────────┘
```

Slide 2 (Como funciona): mesmo layout, título "Como funciona", bullets, "Continuar", indicador ● ● ○ ○ ○.

Slides 3 e 4: título, texto, botão principal ("Permitir" / "Ativar") e link "Agora não", indicador atualizado.

Slide final: "Pronto para começar?", [Entrar], [Criar conta], "Explorar sem conta".

---

**Documento de referência para implementação.** Quando for implementar, usar este arquivo como spec dos textos e da ordem dos slides.

---

## Testar de novo (desenvolvimento)

Em build de **desenvolvimento** (`__DEV__`), é possível resetar o onboarding para exibir o bottom sheet novamente:

- **Como:** estando como **convidado** no feed, faça **long-press (segurar)** no **logo do Adopet** no topo da tela.
- **Efeito:** as chaves `@adopet/onboarding_slides_seen` e `@adopet/guest_saw_welcome_sheet` são removidas do AsyncStorage e o sheet de onboarding é exibido de novo.
- O long-press só tem efeito em dev e quando o usuário está como visitante; em produção o gesto não faz nada.
