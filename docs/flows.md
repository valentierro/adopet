# Fluxos do app

Este documento descreve os principais fluxos de uso do Adopet.

## Login

1. Usuário abre o app → tela de boas-vindas ou feed (visitante)
2. Toca em **Entrar** → `/(auth)/login`
3. Informa email e senha → `authStore.login()`
4. API retorna access + refresh token → tokens salvos no SecureStore
5. `getMe()` busca dados do usuário → `authStore.setUser(me)`
6. Redirect para `/(tabs)` ou onboarding (se primeira vez)

## Cadastro

1. `/(auth)/signup` — nome, email, telefone, documento (CPF/CNPJ), username, senha
2. Pré-verificação: `check-email`, `check-document`
3. `POST /auth/signup`
4. Se exigir verificação de email: redireciona para login; usuário confirma por link
5. Senão: tokens salvos, `getMe()`, opcionalmente onboarding

## Feed e swipes

1. `/(tabs)/feed` — lista pets com filtros (espécie, raio, tamanho, etc.)
2. Visitante pode ver o feed (sem favoritar/curtir)
3. Logado: curte (like) ou passa (pass) → `POST /swipes`
4. Pets que passou não aparecem de novo (a menos que desfaça em "Pets que passei")

## Favoritos e chat

1. Logado curte um pet → pode favoritar
2. Em **Favoritos**, toca no pet → **Iniciar conversa**
3. `POST /conversations` — cria ou retorna conversa existente
4. `/(tabs)/chat/[id]` — envia mensagens de texto e imagem
5. Tutor e interessado conversam; podem combinar visita, entrega, etc.

## Fluxo de adoção (via chat)

1. Tutor decide adotar o pet para alguém que está no chat
2. No chat, toca em **Confirmar adoção**
3. **Checklist obrigatório** — tutor marca:
   - Limite de responsabilidade do app
   - Acompanhamento pós-adoção
   - Entrega do pet
   - Uso do app
4. Após marcar todos, **Confirmar adoção**
5. Adotante recebe notificação e vai em **Confirmar adoção**
6. Se KYC exigido: adotante envia documento e selfie
7. Adotante aceita termo de responsabilidade
8. `POST /pets/:id/confirm-adoption` — adoção registrada
9. Admin aprova ou auto-aprovação (48h)

## Anunciar pet

1. `/(tabs)/add-pet` — formulário em etapas:
   - Fotos (presign S3 → upload)
   - Detalhes (nome, espécie, raça, idade, sexo, tamanho)
   - Saúde (vacinado, castrado)
   - Comportamento (energia, temperamento, boa com crianças/cachorros/gatos)
   - Descrição e motivo da adoção
2. `POST /pets` — pet criado com status PENDING
3. Admin aprova → pet vai para o feed

## Logout

1. Perfil → **Sair**
2. `authStore.logout()` — limpa tokens, user, cache do React Query
3. SecureStore e AsyncStorage limpos
4. Redirect para `/(tabs)/feed` como visitante

## Sessão expirada

1. Token expira ou refresh falha
2. API retorna 401 → client tenta refresh
3. Se refresh falhar: `onSessionExpired` → modal "Sessão expirada"
4. Usuário toca OK → volta ao feed como visitante
