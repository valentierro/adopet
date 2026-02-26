# Mobile — componentes e stores

Estrutura técnica do app React Native.

## Stores (Zustand)

### authStore (`src/stores/authStore.ts`)

Estado global de autenticação.

| Estado | Tipo | Descrição |
|--------|------|-----------|
| accessToken | string \| null | JWT de acesso |
| refreshToken | string \| null | Token de refresh |
| user | User \| null | Dados do usuário logado |
| isHydrated | boolean | Tokens já carregados do storage |
| showLogoutToast | boolean | Exibir toast "Você saiu" |
| sessionExpiredModalVisible | boolean | Modal "Sessão expirada" |

| Ação | Descrição |
|------|-----------|
| login(email, password) | Login e armazenamento de tokens |
| logout() | Limpa tokens, user, cache React Query |
| signup(...) | Cadastro |
| partnerSignup(...) | Cadastro parceiro |
| refreshTokens() | Renova access token |
| hydrate() | Carrega tokens do SecureStore/AsyncStorage |
| setUser(user) | Atualiza user |
| setTokens(access, refresh) | Atualiza e persiste tokens |

## API client (`src/api/client.ts`)

- Base: `EXPO_PUBLIC_API_URL` + `/v1`
- Header `Authorization: Bearer` quando há token
- 401 → tenta refresh automático; se falhar, chama `onSessionExpired`
- `setAuthProvider(getToken, refresh, onSessionExpired)` — registrado no `_layout.tsx`
- `api.get`, `api.post`, `api.put`, `api.patch`, `api.delete`

## Módulos de API (`src/api/`)

| Módulo | Funções principais |
|--------|--------------------|
| auth | login, signup, refresh, logout, forgotPassword |
| me | getMe, updateProfile, getPreferences, updatePreferences |
| feed | getFeed, getMapPins |
| pets | getPet, createPet, updatePet, confirmAdoption, getMatchScore |
| favorites | addFavorite, removeFavorite, getFavorites |
| conversations | getConversations, getConversation, createConversation |
| messages | getMessages, sendMessage |
| swipes | swipe, getPassed, undoPass |
| uploads | presign |
| verification | submitKyc, getKycStatus |

## Componentes principais (`src/components/`)

| Componente | Uso |
|------------|-----|
| ScreenContainer | Layout padrão de tela com SafeArea |
| PrimaryButton, SecondaryButton | Botões |
| PetCard | Card de pet no feed |
| FeedCard | Card do feed com swipe |
| SwipeableCard | Card com gestos de swipe |
| LoadingLogo | Logo animado (loading) |
| HeaderLogo | Logo no header |
| Toast | Notificação temporária |
| MatchScoreBadge | Badge de match 0–100 |
| VerifiedBadge | Ícone de verificado |
| TutorLevelBadge | Nível do tutor |
| PageIntro | Título e subtítulo de página |
| EmptyState | Estado vazio |
| AppErrorBoundary | Captura erros e exibe fallback |
| AppWithOfflineBanner | Banner de offline |
| UpdateAvailableModal | Modal de atualização |
| GuestWelcomeSheet | Sheet de boas-vindas (visitante) |
| OnboardingSlidesSheet | Slides do onboarding |

## Hooks (`src/hooks/`)

| Hook | Descrição |
|------|-----------|
| useTheme | Cores, tema (light/dark) |
| useAppVersionCheck | Compara versão atual com mínima/última (API) |
| usePushToken | Registra push token |
| useNotificationResponse | Responde a notificações (deep link) |

## QueryClient (`src/queryClient.ts`)

- `queryClient` compartilhado
- `queryClient.clear()` no logout para limpar cache
- Persistido em AsyncStorage (`ADOPET_QUERY_CACHE`)

## Storage (`src/storage/`)

| Arquivo | Função |
|---------|--------|
| tokens.ts | getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens (SecureStore/AsyncStorage) |
| onboarding.ts | getOnboardingSeen, setOnboardingSeen, consumeShouldShowOnboardingAfterSignup |
