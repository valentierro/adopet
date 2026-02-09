# Adopet – Ideias de design e funcionalidades

Sugestões com base no que já existe no app, focando em **identidade visual** e **melhorias de produto**.

---

## O que já foi ajustado

- **Paleta:** Verde-teal como cor principal (marca), fundo off-white esverdeado (`#F0F4F3`), superfícies com mais presença. Menos “tudo branco”.
- **Feed:** Card em **tela cheia** (estilo Tinder): foto preenche a tela, gradiente na parte de baixo com nome e meta, botões flutuantes (passar / curtir).
- **Marca:** Nome “Adopet” no topo do feed como identidade visual.

---

## Design – próximos passos

### Identidade visual
- **Logo:** Usar o logo (ex.: `assets/brand/logo/`) no header do feed ou na splash, em vez de só texto “Adopet”.
- **Tipografia:** Definir uma fonte de destaque para títulos (ex.: nome do pet, “Adopet”) para ficar mais reconhecível.
- **Ícone do app:** Garantir que o ícone na home do celular use as mesmas cores da marca (teal/verde).
- **Splash screen:** Alinhar cores da splash com a nova paleta (já existem assets em `assets/brand/splash/`).

### Telas secundárias
- **Favoritos / Conversas / Perfil:** Manter `cardBg` em cards sobre `surface` para contraste; em listas, um leve border ou sombra nos cards pode ajudar.
- **Detalhe do pet:** Cabeçalho com imagem em destaque e gradiente (como no feed) + blocos de informação bem separados.
- **Chat:** Diferenciar bolhas (ex.: cor primária para “eu”, surface para “outro”) e manter fonte/espaçamento consistentes com o restante do app.

### Consistência
- **Botões:** Primary = teal; Secondary = outline; “Destrutivo” (ex.: remover favorito) pode usar `accent` com cuidado.
- **Badges:** Manter StatusBadge com variantes success/warning/neutral alinhadas à paleta.
- **Dark mode:** Já há `darkColors`; revisar contraste em todas as telas principais.

---

## Funcionalidades sugeridas

### Curto prazo (MVP+)
- **Galeria no card:** No feed ou no detalhe, permitir **deslizar entre várias fotos** do pet (já existe `pet.photos[]`).
- **Indicador de “match”:** Ao curtir, um toast ou animação rápida tipo “Adicionado aos favoritos” ou “Match!” para dar feedback.
- **Filtros rápidos no feed:** Além de preferências (raio, espécie), um chip “Só cachorros” / “Só gatos” / “Todos” na própria tela do feed.
- **Pull-to-refresh:** No feed e na lista de favoritos, puxar para atualizar.

### Médio prazo
- **Histórico de swipes:** Opção “Desfazer” logo após passar (deslizar para esquerda) para recuperar o último card.
- **Notificações úteis:** “Novos pets na sua região”, “Alguém quer conversar sobre [pet]”.
- **Perfil do tutor:** No detalhe do pet, um toque no “dono” que abre um mini perfil (nome, foto, quantos pets) antes de abrir o chat.
- **Fotos em alta qualidade:** Carregar thumbnail no feed e full-res ao abrir detalhe (lazy load).

### Expansão futura (quando for fase “outros pets, licenças, etc.”)
- **Outros tipos de pet:** Filtro por espécie (já existe estrutura); adicionar raça como campo opcional e filtro.
- **Relatórios/denúncia:** Botão discreto “Reportar” em pet ou conversa, com fluxo simples (motivo + envio).
- **Onboarding:** Telas de boas-vindas explicando “curtir = favoritar” e “conversar só com favoritos”.
- **Analytics internos:** Eventos (swipe, like, abertura de chat) para melhorar feed e métricas de produto.

---

## Resumo rápido

| Foco            | Ação sugerida                                              |
|-----------------|------------------------------------------------------------|
| Menos branco    | ✅ Feito: fundo `#F0F4F3`, surface `#E2EAE8`, teal como primária |
| Card tela cheia | ✅ Feito: FeedCard full-screen + botões flutuantes         |
| Marca           | Usar logo no feed/splash; tipografia própria               |
| Feedback        | Toast/animar ao curtir; galeria de fotos no card          |
| Consistência    | Manter cardBg/surface/primary em todas as telas           |

Se quiser, na próxima etapa podemos implementar uma dessas ideias (ex.: galeria de fotos no FeedCard ou logo no header).
