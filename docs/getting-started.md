# Configuração inicial

Este guia explica como configurar o projeto Adopet na sua máquina para desenvolvimento.

## Requisitos

Antes de começar, instale:

| Requisito | Versão | Onde baixar |
|-----------|--------|-------------|
| Node.js | 18 ou superior | https://nodejs.org |
| pnpm | 9 (via Corepack) | `corepack enable` |
| Git | Qualquer versão recente | https://git-scm.com |

**Opcional (se for usar banco local):**
- Docker Desktop — para rodar PostgreSQL localmente

## Clonar o repositório

```bash
git clone https://github.com/SEU_ORG/adopet.git
cd adopet
```

## Setup automático

### Opção 1: Com Docker (banco local)

Se você tem Docker instalado e quer rodar PostgreSQL na sua máquina:

```bash
./setup.sh
```

O script vai:
1. Verificar Node.js e Docker
2. Instalar dependências com pnpm
3. Fazer build do pacote `@adopet/shared`
4. Criar arquivos `.env` a partir dos exemplos
5. Subir o PostgreSQL
6. Aplicar migrations e seed

### Opção 2: Sem Docker (ambiente cloud)

Se você vai usar banco Neon e API na Vercel (como em produção):

```bash
./setup.sh --cloud
```

O script vai:
1. Verificar Node.js
2. Instalar dependências
3. Fazer build do shared
4. Criar arquivos `.env`

**Depois**, edite os arquivos `.env` com suas credenciais:
- `apps/api/.env` — `DATABASE_URL` (Neon), `JWT_SECRET`, etc.
- `apps/mobile/.env` — `EXPO_PUBLIC_API_URL` (URL da API na Vercel)

## Verificar se funcionou

1. **Backend (se estiver rodando local):**
   ```bash
   ./scripts/dev-api.sh
   ```
   Acesse http://localhost:3000/v1/health — deve retornar `{"status":"ok"}`. Swagger em http://localhost:3000/api/docs ou docs/swagger/index.html (Try it out). Swagger em http://localhost:3000/api/docs ou `docs/swagger/index.html` (Try it out).  
   Swagger em http://localhost:3000/api/docs ou `docs/swagger/index.html` para Try it out.

2. **Mobile:**
   ```bash
   ./scripts/dev-mobile.sh
   ```
   Pressione `i` para abrir no simulador iOS ou `a` para Android.

## Erros comuns

### "pnpm: command not found"

Ative o Corepack (vem com o Node.js):
```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

### "Failed to create cache directory" (pnpm)

Use o cache dentro do projeto:
```bash
export COREPACK_HOME="$(pwd)/.cache/corepack"
pnpm install
```
Ou use o script: `./scripts/pnpm-with-cache.sh install`

### Docker não encontrado

- Instale o Docker Desktop: https://docs.docker.com/get-docker/
- Ou use `./setup.sh --cloud` e configure Neon
