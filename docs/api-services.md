# API — serviços e controllers

Estrutura técnica da API NestJS.

## Controllers e serviços

| Módulo | Controller | Service | Responsabilidade |
|--------|------------|---------|------------------|
| auth | AuthController | AuthService | Login, signup, refresh, logout, forgot/change/set password |
| feed | FeedController | FeedService | Feed paginado, mapa (pins) |
| pets | PetsController | PetsService | CRUD pets, adoções, visualizações |
| swipes | SwipesController | SwipesService | Curtir, passar, desfazer |
| favorites | FavoritesController | FavoritesService | Favoritos |
| conversations | ConversationsController | ConversationsService, TypingService | Conversas, typing |
| messages | (em conversations) | MessagesService | Mensagens do chat |
| me | MeController | MeService, TutorStatsService | Perfil, preferências, KYC, parceiro, notificações |
| admin | AdminController | AdminService | Painel admin |
| admin/bulk | AdminBulkController | AdminBulkService | Importação em lote |
| partners | PartnersController | PartnersService | Parceiros públicos |
| moderation | ReportsController, BlocksController | ReportsService, BlocksService | Denúncias, bloqueios |
| verification | VerificationController | VerificationService | KYC |
| uploads | UploadsController | UploadsService | Presign S3 |
| health | HealthController | — | Healthcheck, app-config |
| saved-search | SavedSearchController | SavedSearchService | Buscas salvas |
| priority-engine | PriorityEngineController | PriorityEngineService | Ranking de adotantes |
| marketplace | MarketplaceController | (PartnersService) | Marketplace |
| public | PublicController | PublicService | Stats, adoções recentes |
| feature-flag | ClientConfigController | FeatureFlagService | Feature flags |
| bug-reports | BugReportsController | BugReportsService | Bug/sugestões |
| payments | PaymentsController | StripeService | Webhook Stripe |
| partner-recommendations | PartnerRecommendationsController | PartnerRecommendationsService | Indicações |

## Métodos principais (por serviço)

### AuthService
- `checkEmailAvailable(email)` — verifica se email está livre
- `checkDocumentAvailable(document)` — verifica se CPF/CNPJ está livre
- `signup(dto)` — cadastro usuário
- `partnerSignup(dto)` — cadastro parceiro
- `login(dto)` — retorna access + refresh token
- `refresh(refreshToken)` — renova tokens
- `logout(refreshToken)` — invalida refresh token
- `forgotPassword(dto)` — envia email de reset
- `changePassword(userId, dto)` — troca senha (autenticado)
- `confirmEmail(token)` — confirma email
- `setPassword(token, password)` — define senha via token

### FeedService
- `getFeed(query)` — feed paginado com filtros (species, sex, size, lat/lng, radiusKm, etc.)
- `getMapPins(query)` — pins para mapa (lat, lng, radiusKm, species)
- Algoritmo de relevância: distância, recência, engajamento, compatibilidade, match score

### PetsService
- `create(ownerId, dto)` — criar pet
- `update(petId, ownerId, dto)` — atualizar pet
- `findById(petId)` — pet por ID
- `findMine(ownerId)` — pets do usuário
- `updateStatus(petId, status)` — AVAILABLE, IN_PROCESS, ADOPTED
- `confirmAdoption(petId, adopterId, body)` — adotante confirma adoção
- `getMatchScore(petId, adopterId)` — score de match pet ↔ adotante

### SwipesService
- `swipe(userId, petId, action)` — LIKE ou PASS
- `getPassed(userId)` — pets que passou
- `undoPass(userId, petId)` — desfazer passar

### FavoritesService
- `add(userId, petId)` — adicionar favorito
- `remove(userId, petId)` — remover
- `list(userId, cursor)` — listar com paginação

### ConversationsService
- `findOrCreate(petId, adopterId)` — cria ou retorna conversa
- `list(userId)` — conversas do usuário
- `findById(id)` — conversa por ID

### MessagesService
- `list(conversationId, cursor)` — mensagens paginadas
- `send(conversationId, senderId, body)` — enviar texto ou imagem

### MeService
- `getProfile(userId)` — perfil do usuário
- `updateProfile(userId, dto)` — atualizar perfil
- `getPreferences(userId)` — preferências
- `updatePreferences(userId, dto)` — atualizar preferências
- `deactivate(userId)` — desativar conta
- `exportData(userId)` — exportar dados (LGPD)

### MatchEngineService
- `computeMatchScore(adopter, petPreferences)` — score 0–100 e critérios (highlights/concerns)
- Usado pelo feed para ordenar e pelo pet detail para exibir badge

### TutorStatsService
- `getTutorStats(userId)` — pontuação e nível do tutor (baseado em adoções)

## DTOs e validação

Os controllers usam DTOs com `class-validator` (ex.: `@IsEmail()`, `@IsOptional()`, `@IsEnum()`). Os schemas Zod em `@adopet/shared` são usados no mobile para validação client-side.
