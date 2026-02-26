# Banco de dados

O Adopet usa **PostgreSQL** com **Prisma** como ORM.

> Para o **schema completo**, modelos detalhados e relacionamentos, veja [Banco de dados — schema](database-schema.md).

## Modelos principais

### User
Usuário do app: email, nome, username, senha (hash), avatar, telefone, documento (CPF/CNPJ), cidade, bio, preferências de moradia, experiência com pets, KYC, etc.

### Pet
Pet anunciado: nome, espécie, raça, idade, sexo, tamanho, vacinado, castrado, descrição, fotos (PetMedia), status (AVAILABLE, ADOPTED), ownerId, partnerId.

### Swipe
Curtida ou “passar”: userId, petId, action (LIKE | PASS).

### Favorite
Favorito: userId, petId.

### Conversation / Message
Conversa entre interessado e tutor: Conversation (petId, adopterId), Message (conteúdo, imagem, senderId).

### Adoption
Registro de adoção: petId, tutorId, adopterId, adoptedAt, responsibilityTermAcceptedAt.

### Partner
Parceiro (ONG, clínica, loja): nome, slug, tipo, descrição, logo, plano Stripe, etc.

### Outros
- **UserPreferences** — raio, espécie, tamanho preferidos
- **SavedSearch** — buscas salvas
- **Report** — denúncias (usuário, pet, mensagem)
- **Block** — usuários bloqueados
- **Verification** — KYC (documento, selfie)
- **InAppNotification** — notificações no app
- **FeatureFlag** — feature flags por escopo

## Schema e migrations

O schema está em `apps/api/prisma/schema.prisma`.

### Comandos

| Ação | Comando |
|------|---------|
| Aplicar migrations | `./scripts/migrate.sh` |
| Criar migration | `./scripts/migrate-new.sh "nome"` |
| Seed | `./scripts/seed.sh` |
| Prisma Studio (GUI) | `cd apps/api && pnpm prisma:studio` |

## Relacionamentos (resumo)

- **User** → Pet (owner), Swipe, Favorite, Message, Adoption (tutor ou adotante)
- **Pet** → User (owner), PetMedia, Swipe, Favorite, Conversation, Adoption
- **Conversation** → Pet, Message
- **Partner** → Pet, PartnerMember, PartnerCoupon, PartnerService
