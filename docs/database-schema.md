# Banco de dados — schema completo

O Adopet usa PostgreSQL com Prisma ORM. Schema em `apps/api/prisma/schema.prisma`.

## Modelos e relacionamentos

### User (usuário)
- **Campos principais:** id, email, username, passwordHash, name, avatarUrl, phone, document (CPF/CNPJ), city, bio
- **Perfil de moradia:** housingType, hasYard, hasOtherPets, hasChildren, timeAtHome, petsAllowedAtHome
- **Experiência:** dogExperience, catExperience
- **KYC:** kycStatus, kycDocumentKey, kycSelfieKey, kycSubmittedAt, kycVerifiedAt
- **Outros:** deactivatedAt, bannedAt, pushToken, emailVerifiedAt
- **Relações:** pets, swipes, favorites, messages, conversations, preferences, adoptionsAsTutor, adoptionsAsAdopter, partner, partnerMemberships, inAppNotifications, verifications, reports, blocks

### UserPreferences
- userId (FK → User), species (DOG|CAT|BOTH), radiusKm, sizePref, sexPref, latitude, longitude
- Notificações: notifyNewPets, notifyMessages, notifyReminders, notifyListingReminders

### Pet
- **Identificação:** name, species, breed, age, sex, size, vaccinated, neutered
- **Descrição:** description, adoptionReason, feedingType, feedingNotes
- **Comportamento:** energyLevel, temperament, isDocile, isTrained, goodWithDogs, goodWithCats, goodWithChildren
- **Saúde:** healthNotes, hasSpecialNeeds
- **Preferência de tutor:** preferredTutorHousingType, preferredTutorHasYard, preferredTutorTimeAtHome, etc.
- **Status:** status (AVAILABLE|IN_PROCESS|ADOPTED), publicationStatus (PENDING|APPROVED|REJECTED)
- **Adoção:** pendingAdopterId, adopterConfirmedAt, adopetConfirmedAt, markedAdoptedAt
- **Localização:** latitude, longitude, city
- **Owner:** ownerId (FK → User), partnerId (FK → Partner, opcional)
- **Relações:** media (PetMedia), swipes, favorites, conversations, adoption, views, petPartnerships

### PetMedia
- petId (FK → Pet), url, sortOrder, isPrimary

### Swipe
- userId (FK → User), petId (FK → Pet), action (LIKE|PASS)
- Único por (userId, petId)

### Favorite
- userId (FK → User), petId (FK → Pet)
- Único por (userId, petId)

### PetView
- petId, userId, viewedAt, revisitedFromPassedAt
- Registra visualizações e “revisitas” a partir de “pets que passou”

### Conversation
- petId (FK → Pet), adopterId (User), type (NORMAL|ADOPTION_CONFIRMATION)
- Relações: participants (ConversationParticipant), messages (Message)

### Message
- conversationId (FK → Conversation), senderId (FK → User, nullable para sistema), isSystem, content, imageUrl, readAt

### Adoption
- petId (FK → Pet, unique), tutorId (FK → User), adopterId (FK → User)
- adoptedAt, responsibilityTermAcceptedAt
- Um pet só pode ter uma Adoption

### Partner
- type (ONG|CLINIC|STORE), name, slug, city, description, logoUrl, active
- Stripe: stripeCustomerId, stripeSubscriptionId, planId, subscriptionStatus
- Relações: pets, coupons, services, members, petPartnerships

### PartnerMember, PartnerCoupon, PartnerService, PartnerEvent
- Modelos auxiliares de parceiros (membros, cupons, serviços, eventos de analytics)

### Outros modelos
- **Report** — denúncias (USER|PET|MESSAGE)
- **Block** — bloqueios entre usuários
- **Verification** — KYC (USER_VERIFIED|PET_VERIFIED)
- **SavedSearch** — buscas salvas
- **InAppNotification** — notificações no app
- **FeatureFlag** — feature flags (GLOBAL|CITY|PARTNER)
- **PetPartnership** — parceria pet ↔ parceiro
- **PartnershipRequest** — solicitações de parceria
- **SatisfactionSurvey** — pesquisa de satisfação
- **BugReport** — bug reports / sugestões
- **RefreshToken** — tokens de refresh para auth

## Diagrama de relacionamentos (resumo)

```
User ←→ Pet (owner)
User ←→ Swipe, Favorite, Message
User ←→ Adoption (tutor ou adopter)
Pet  ←→ PetMedia, Swipe, Favorite, Conversation
Pet  ←→ Adoption (1:1)
Pet  ←→ Partner (opcional)
Conversation ←→ Message
User ←→ Partner (1:1, dono)
Partner ←→ Pet, PartnerMember, PartnerCoupon, PartnerService
```

## Índices importantes

- Pet: `(publicationStatus, status, id)`, `(publicationStatus, status, expiresAt, id)`, `(ownerId)`
- Swipe: `(userId, petId)` unique
- Favorite: `(userId, petId)` unique, `(userId, createdAt)`
- Message: `(conversationId, createdAt)`
- InAppNotification: `(userId)`, `(userId, readAt)`, `(userId, archivedAt)`
