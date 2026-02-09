# Adopet

Monorepo do **Adopet** — app de adoção de pets no Brasil.

## Documentação de fluxos

- [**Fluxo de adoção**](docs/ADOPTION_FLOW.md) — como um pet é marcado como adotado e o que acontece no feed, mapa e pontuação do tutor.

## Estrutura

```
adopet/
├── apps/
│   ├── mobile/     # App React Native (Expo)
│   └── api/        # API NestJS
├── packages/
│   └── shared/     # Tipos, schemas Zod e utils compartilhados
├── assets/
│   └── brand/      # Branding oficial (logo, ícone, splash)
├── infra/          # Docker Compose (PostgreSQL, Redis)
├── pnpm-workspace.yaml
└── package.json
```

## Requisitos

- **Node.js** >= 18
- **pnpm** >= 9 (ou use Corepack: `corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** e **Docker Compose** (para infraestrutura local)

### Erro "Failed to create cache directory"

Se o pnpm (Corepack) reclamar de permissão em `~/.cache/node/corepack/v1`, use cache dentro do projeto. **Na raiz do monorepo**, rode numa mesma linha:

```bash
export COREPACK_HOME="$(pwd)/.cache/corepack" && pnpm install
```

Ou use o script que já define a variável (na raiz do projeto):

```bash
./scripts/pnpm-with-cache.sh --version
./scripts/pnpm-with-cache.sh install
```

Ou defina a variável manualmente e use o pnpm em seguida:

```bash
export COREPACK_HOME="$(pwd)/.cache/corepack"
pnpm --version
pnpm install
```

Para não precisar do `export` toda vez neste projeto, adicione no `~/.zshrc`:

```bash
export COREPACK_HOME="$HOME/Documents/adopet/.cache/corepack"
```

Alternativa: criar o diretório em casa e dar permissão:

```bash
mkdir -p ~/.cache/node/corepack/v1
chmod -R u+rwx ~/.cache
```

## Como rodar

### 1. Instalar dependências

```bash
pnpm install
```

(Se usar cache no projeto: `export COREPACK_HOME="$(pwd)/.cache/corepack"` antes, ou use `./scripts/pnpm-with-cache.sh install`.)

### 2. Build do pacote shared (obrigatório antes de API e mobile)

```bash
pnpm --filter @adopet/shared build
```

### 3. Subir infraestrutura (PostgreSQL) — só se for rodar a API com banco

```bash
pnpm infra:up
```

Para incluir Redis (perfil opcional):

```bash
docker compose -f infra/docker-compose.yml --profile with-redis up -d
```

### 4. Subir infra e rodar a API

```bash
pnpm infra:up
cp apps/api/.env.example apps/api/.env
# DATABASE_URL padrão: postgresql://adopet:adopet@localhost:5432/adopet
cd apps/api && pnpm prisma migrate dev --name init
pnpm prisma:seed
cd ../..
pnpm dev:api
```

- **API:** http://localhost:3000/v1  
- **Swagger:** http://localhost:3000/api/docs  
- **Health:** http://localhost:3000/v1/health  
- **Feed:** GET /v1/feed?userId=...&cursor=...  
- **Swipes:** POST /v1/swipes  

### 5. Rodar o app mobile (apontando para a API)

```bash
cp apps/mobile/.env.example apps/mobile/.env
# Garanta EXPO_PUBLIC_API_URL=http://localhost:3000/v1 (no Mac/simulador localhost funciona)
pnpm dev:mobile
```

Abra com **Expo Go** no celular (escaneie o QR code) ou use **`i`** (iOS) / **`a`** (Android) no terminal para o simulador. O feed e os swipes (curtir/passar) usam a API real; favoritos e chat seguem com mock.

### Scripts na raiz

| Script        | Descrição                          |
|---------------|------------------------------------|
| `pnpm dev`    | Sobe mobile e API em paralelo      |
| `pnpm lint`   | Roda lint em todos os pacotes      |
| `pnpm format` | Formata código com Prettier        |
| `pnpm test`   | Roda testes (placeholder)          |
| `pnpm infra:up`   | Sobe PostgreSQL (e Redis se usar perfil) |
| `pnpm infra:down` | Para e remove containers           |

## Branding (assets)

Os assets oficiais do Adopet estão em:

- **Logo:** `assets/brand/logo/` (light e dark)
- **Ícone do app:** `assets/brand/icon/` (light e dark)
- **Splash:** `assets/brand/splash/` (light e dark)

**Regras:**

- Não criar novos logos ou ícones.
- Não alterar visualmente os arquivos oficiais.
- O app mobile usa esses assets para ícone e splash. Se algum tamanho não for o ideal para a store (ex.: 1024x1024 para ícone iOS), não recriar o arte; documentar no README do mobile como ajustar depois (redimensionamento externo, etc.).

## Documentação por app

- [Mobile (Expo)](apps/mobile/README.md)
- [API (NestJS)](apps/api/README.md)

## Crescimento do projeto

O monorepo está preparado para:

- Novos tipos de pets e anúncios
- Funcionalidades premium
- Novos módulos na API (auth, swipes, mensagens, etc.) — já em scaffold
