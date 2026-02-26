# App mobile

O app do Adopet é feito em **React Native** com **Expo**, usando **Expo Router** para navegação.

## Como rodar

```bash
# Na raiz do projeto
./scripts/dev-mobile.sh
# ou
pnpm dev:mobile
```

Com o Metro rodando:
- **`i`** — abre no simulador iOS
- **`a`** — abre no emulador Android
- **QR code** — Expo Go no celular (mesma rede)

## Estrutura do app

```
apps/mobile/
├── app/                    # Rotas (Expo Router)
│   ├── _layout.tsx         # Layout raiz (Query, Stack)
│   ├── index.tsx           # Tela inicial (redirect)
│   ├── (auth)/             # Login, signup, welcome
│   ├── (onboarding)/       # Tour inicial
│   ├── (tabs)/             # Tabs principais
│   │   ├── index.tsx       # Home / dashboard
│   │   ├── feed.tsx        # Feed de pets
│   │   ├── favorites.tsx   # Favoritos
│   │   ├── add-pet.tsx     # Anunciar pet
│   │   ├── chats.tsx       # Lista de conversas
│   │   ├── chat/[id].tsx   # Conversa
│   │   ├── profile.tsx     # Perfil
│   │   ├── pet/[id].tsx    # Detalhes do pet
│   │   └── ...
│   └── ...
├── src/
│   ├── api/                # Cliente HTTP, endpoints
│   ├── stores/             # Zustand (authStore)
│   ├── hooks/              # useTheme, useAppVersionCheck, etc.
│   ├── components/         # Componentes reutilizáveis
│   └── theme/              # Cores, spacing
└── assets/
```

## Estado (state)

### Zustand — `authStore`

Guarda autenticação:
- `accessToken`, `refreshToken`
- `user` (dados do usuário logado)
- `login()`, `logout()`, `refreshTokens()`, `hydrate()`

Os tokens são persistidos no **SecureStore** (iOS/Android) ou AsyncStorage (web).

### React Query

Cacheia dados da API:
- Feed, favoritos, conversas, pets, etc.
- Persistido em AsyncStorage (`ADOPET_QUERY_CACHE`)
- No logout, o cache é limpo

## Telas principais

| Rota | Descrição |
|------|-----------|
| `/(auth)/welcome` | Boas-vindas, botão Entrar |
| `/(auth)/login` | Login |
| `/(auth)/signup` | Cadastro |
| `/(tabs)/feed` | Feed de pets (swipes) |
| `/(tabs)/favorites` | Pets favoritados |
| `/(tabs)/add-pet` | Formulário para anunciar pet |
| `/(tabs)/chats` | Lista de conversas |
| `/(tabs)/chat/[id]` | Chat com tutor/interessado |
| `/(tabs)/profile` | Perfil, configurações, sair |
| `/(tabs)/pet/[id]` | Detalhes do pet |
| `/(tabs)/entrar` | Redireciona para welcome (visitante) |

## API client

O cliente HTTP está em `src/api/client.ts`:
- Base URL: `EXPO_PUBLIC_API_URL` + `/v1`
- JWT em `Authorization: Bearer`
- Refresh automático em 401
- `setAuthProvider()` registra funções de auth no layout

## Variáveis de ambiente

Em `apps/mobile/.env`:

| Variável | Descrição |
|----------|-----------|
| EXPO_PUBLIC_API_URL | URL da API (ex: http://localhost:3000 ou https://api.vercel.app/v1) |

- **Simulador:** `localhost` funciona
- **Celular físico:** use o IP da máquina na mesma rede
- **Produção:** URL da API na Vercel
