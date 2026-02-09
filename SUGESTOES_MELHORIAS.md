# Adopet – Sugestões de melhoria e novas funcionalidades

Lista organizada por categoria e impacto, para priorizar próximas entregas.

---

## Melhorias de UX (rápido impacto)

| Sugestão | Descrição | Onde |
|----------|-----------|------|
| **Pull-to-refresh** | Puxar para atualizar no feed, favoritos, conversas e “Meus anúncios”. | Feed, Favoritos, Chats, My-pets |
| **Galeria no card do feed** | Já existe mais de uma foto por pet; garantir que o usuário veja indicador (dots) e possa deslizar entre fotos no próprio card. | FeedCard |
| **Feedback ao curtir** | Toast ou animação (“Adicionado aos favoritos” / “Match!”) ao dar like, para confirmar a ação. | Index (feed) |
| **Filtros rápidos no feed** | Chips “Cachorros” / “Gatos” / “Todos” na tela do feed, além das preferências salvas. | Index (feed) |
| **Estado vazio amigável** | Ilustração + texto quando não há favoritos, conversas ou pets no feed (evitar tela em branco). | Favoritos, Chats, Feed |
| **Skeleton / loading** | Placeholder de carregamento no feed e listas em vez de só spinner. | Feed, My-pets, Chats |
| **Desfazer swipe** | Botão ou gesto “Desfazer” logo após passar no card (recuperar o último pet). | Feed |

---

## Perfil e onboarding

| Sugestão | Descrição |
|----------|-----------|
| **Onboarding** | 2–3 telas após o primeiro login explicando: curtir = favoritar, conversar só com favoritos, como solicitar verificação. |
| **Completar perfil** | Incentivo (badge ou prompt) para preencher foto, telefone e cidade; opcionalmente “força” antes de publicar pet. |
| **Avatar real** | Suporte a upload de foto do perfil (já existe upload no projeto; conectar ao `avatarUrl` do usuário). |
| **Mini perfil do tutor** | No detalhe do pet, toque no “dono” abre um card com nome, foto e quantos pets tem, antes de ir ao chat. |

---

## Pets e anúncios

| Sugestão | Descrição |
|----------|-----------|
| **Raça (opcional)** | Campo `breed` opcional no pet e filtro “Raça” no feed (ex.: Golden, SRD, Persa). |
| **Múltiplas fotos no cadastro** | Fluxo de “Adicionar pet” já com upload de várias fotos (presign + confirm) e ordem arrastar. |
| **Fotos em qualidade** | Thumbnail no feed e imagem em resolução maior ao abrir o detalhe (lazy load). |
| **Status do anúncio visível** | No “Meus anúncios”, destaque visual para Disponível / Em processo / Adotado (já existe no backend). |
| **Editar fotos** | Na edição do pet, reordenar, adicionar e remover fotos sem recriar o anúncio. |
| **Motivo da adoção** | Campo opcional “Por que está doando?” para dar mais contexto e confiança. |

---

## Chat e conversas

| Sugestão | Descrição |
|----------|-----------|
| **Indicador de digitação** | “Fulano está digitando…” (requer backend em tempo real ou polling). |
| **Envio de foto no chat** | Enviar imagem na conversa (upload + tipo MESSAGE com anexo). |
| **Preview do pet no chat** | No cabeçalho da conversa, mostrar foto e nome do pet que originou o chat. |
| **Notificação de nova mensagem** | Push quando chegar mensagem (já existe push token; integrar com evento de nova mensagem). |
| **Bloquear no chat** | Botão “Bloquear usuário” dentro do chat (usa API de blocks existente) e opção de denunciar. |
| **Histórico persistente** | Garantir que mensagens antigas carreguem ao abrir a conversa (infinite scroll já existe; validar edge cases). |

---

## Segurança e moderação

| Sugestão | Descrição |
|----------|-----------|
| **Painel admin de verificação** | Endpoints e tela para aprovar/rejeitar solicitações de USER_VERIFIED e PET_VERIFIED. |
| **Painel de denúncias** | Lista de reports (USER/PET/MESSAGE) com ações: ignorar, advertir, bloquear. |
| **Bloquear usuário** | Na lista de conversas ou no perfil do outro, opção “Bloquear” (backend já tem blocks). |
| **Termos e política** | Tela de Termos de Uso e Política de Privacidade (link no cadastro e no perfil). |
| **Conta desativada** | Fluxo “Desativar conta” (soft delete) e opção de reativar por email. |

---

## Notificações e engajamento

| Sugestão | Descrição |
|----------|-----------|
| **Novos pets na região** | Push “X novos pets perto de você” (agendar job por preferência de raio/espécie). |
| **Lembrete de conversa** | “Você tem uma conversa pendente sobre [pet]” após 24–48h sem resposta. |
| **Match/conversa iniciada** | Push “Fulano quer conversar sobre [pet]” quando alguém favorita e inicia conversa. |
| **Configurar notificações** | Na configurações, ligar/desligar por tipo (novos pets, mensagens, lembretes). |
| **Badge no ícone de conversas** | Número de conversas não lidas na tab Chats (requer `readAt`/contagem no backend). |

---

## Feed e descoberta

| Sugestão | Descrição |
|----------|-----------|
| **Recomendações** | Ajustar score do feed (já existe) com mais sinais: espécie preferida, tamanho, favoritos similares. |
| **“Pets que você passou”** | Aba ou seção com histórico de passados para “reconsiderar” (re-swipe). |
| **Compartilhar anúncio** | Botão “Compartilhar” no detalhe do pet (link deep link ou share nativo). |
| **Mapa de pets** | Ver pins de pets no mapa por região (usar latitude/longitude já existentes). |
| **Salvar busca** | “Me avise quando tiver um cachorro pequeno em SP” (alertas por filtro + região). |

---

## Performance e técnico

| Sugestão | Descrição |
|----------|-----------|
| **Paginação em listas** | Favoritos e “Meus anúncios” com cursor/offset para muitos itens. |
| **Cache de imagens** | Usar `expo-image` ou cache nativo para fotos do feed e detalhe. |
| **Offline básico** | Cache de feed/favoritos para exibir última versão sem rede (ex.: React Query persist). |
| **Analytics** | Eventos (swipe, like, abertura de chat, conclusão de cadastro) para métricas e A/B test. |
| **Testes E2E** | Detox ou Maestro para fluxos críticos: login, like, abrir chat. |

---

## Identidade e marca

| Sugestão | Descrição |
|----------|-----------|
| **Logo no header/splash** | Usar `assets/brand/logo` no topo do feed e na splash (já citado em DESIGN_IDEAS). |
| **Tipografia** | Fonte de destaque para “Adopet” e nomes de pets. |
| **Ícone do app** | Ícone na home do celular alinhado às cores teal/verde. |
| **Dark mode** | Revisar contraste em todas as telas com `darkColors` já definido. |

---

## Resumo por prioridade sugerida

| Prioridade | Foco | Exemplos |
|------------|------|----------|
| **P1** | UX imediata | Pull-to-refresh, feedback ao curtir, filtros no feed, estado vazio |
| **P2** | Confiança e segurança | Painel admin verificação/denúncias, termos, bloquear no chat |
| **P3** | Engajamento | Notificações úteis, preview do pet no chat, indicador de digitação |
| **P4** | Crescimento e escala | Mapa, “pets que passou”, compartilhar, analytics |

Se quiser, na próxima etapa podemos detalhar ou implementar uma dessas sugestões (por exemplo: pull-to-refresh no feed, painel admin de verificação ou onboarding).
