# Referência da API

Base URL: `/v1` (ex: http://localhost:3000/v1)

## Swagger (documentação interativa)

A API expõe documentação OpenAPI/Swagger com **Try it out** para executar chamadas direto do navegador.

### Opção 1: Swagger embutido na API (API rodando)

Acesse **http://localhost:3000/api/docs** quando a API estiver rodando. Use o botão **Authorize** para colar o JWT e depois **Try it out** em qualquer endpoint.

### Opção 2: Swagger standalone (HTML)

Arquivo `docs/swagger/index.html` — pode ser aberto direto ou servido pelo GitHub Pages.

- **Com API rodando:** abra `docs/swagger/index.html` — ele carrega o spec de `http://localhost:3000/api/docs-json` e permite **Try it out**.
- **Offline/estático:** rode `pnpm openapi:fetch` com a API em execução para gerar `docs/swagger/openapi.json`, depois use `?url=./openapi.json` ao abrir o HTML.
- **Produção:** use `?url=https://api.appadopet.com.br/api/docs-json` para apontar ao servidor de produção.

```bash
# Gerar openapi.json a partir da API em execução
pnpm openapi:fetch
# ou manualmente
./scripts/fetch-openapi.sh
./scripts/fetch-openapi.sh https://api.appadopet.com.br  # produção
```

## Autenticação

A maioria dos endpoints exige **JWT** no header:
```
Authorization: Bearer <access_token>
```

Endpoints de login/signup não exigem token.

## Módulos principais

### Auth (`/v1/auth`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /auth/login | Login |
| POST | /auth/signup | Cadastro |
| POST | /auth/refresh | Renovar token |
| POST | /auth/logout | Logout |
| POST | /auth/forgot-password | Esqueci a senha |
| POST | /auth/change-password | Trocar senha |
| POST | /auth/partner-signup | Cadastro parceiro |

### Feed (`/v1/feed`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /feed | Feed de pets (filtros, cursor) |
| GET | /feed/map | Pins do mapa (lat, lng, radiusKm) |

### Pets (`/v1/pets`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /pets/:id | Pet por ID |
| POST | /pets | Criar pet |
| PUT | /pets/:id | Atualizar pet |
| PATCH | /pets/:id/status | Mudar status (AVAILABLE, ADOPTED) |
| GET | /pets/mine | Meus pets |
| POST | /pets/:id/confirm-adoption | Confirmar adoção |
| POST | /pets/:id/view | Registrar visualização |

### Swipes (`/v1/swipes`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /swipes | Curtir ou passar |
| GET | /swipes/passed | Pets que passei |
| DELETE | /swipes/passed/:petId | Desfazer passar |

### Favorites (`/v1/favorites`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /favorites | Adicionar favorito |
| DELETE | /favorites/:petId | Remover favorito |
| GET | /favorites | Listar favoritos |

### Conversas e mensagens
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /conversations | Criar/obter conversa |
| GET | /conversations | Listar conversas |
| GET | /conversations/:id | Obter conversa |
| GET | /conversations/:id/messages | Mensagens (cursor) |
| POST | /conversations/:id/messages | Enviar mensagem |

### Me (`/v1/me`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /me | Usuário atual |
| PUT | /me | Atualizar perfil |
| GET | /me/preferences | Preferências |
| PUT | /me/preferences | Atualizar preferências |
| GET | /me/adoptions | Minhas adoções |
| GET | /me/notifications | Notificações |
| PUT | /me/deactivate | Desativar conta |

### Outros
- **Uploads** — presign S3 para fotos
- **Reports** — denúncias
- **Blocks** — bloquear usuário
- **Verification** — KYC
- **Admin** — painel administrativo
- **Partners** — parceiros, cupons, serviços

Veja o Swagger para a lista completa e parâmetros.
