# Diagramas da arquitetura

Diagramas visuais do Adopet. Funcionam no GitHub e em ferramentas que suportam Mermaid.

---

## Visão geral do sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USUÁRIO                                        │
│  (Celular iOS/Android)                                                   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    APP MOBILE (React Native + Expo)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Zustand   │  │ React Query │  │ Expo Router │  │ API Client  │    │
│  │ (authStore) │  │   (cache)   │  │  (rotas)    │  │  (fetch)    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘    │
└────────────────────────────────────────────────────────────┼────────────┘
                                                             │ HTTPS
                                                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    API (NestJS) — Vercel                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Controllers │──│  Services   │──│   Prisma    │  │  S3/MinIO   │    │
│  │  (REST)     │  │  (lógica)   │  │   (ORM)     │  │  (fotos)    │    │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────┘    │
└───────────────────────────────────────────┼─────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PostgreSQL (Neon / Docker local)                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Diagrama do banco de dados (ER)

```mermaid
erDiagram
    User ||--o{ Pet : "own"
    User ||--o{ Swipe : "makes"
    User ||--o{ Favorite : "has"
    User ||--o{ Message : "sends"
    User ||--o| UserPreferences : "has"
    User ||--o{ Adoption : "tutor"
    User ||--o{ Adoption : "adopter"
    User ||--o| Partner : "owns"
    User ||--o{ InAppNotification : "receives"
    
    Pet ||--o{ PetMedia : "has"
    Pet ||--o{ Swipe : "receives"
    Pet ||--o{ Favorite : "in"
    Pet ||--o{ Conversation : "about"
    Pet ||--o| Adoption : "adopted"
    Pet ||--o{ PetView : "viewed"
    Pet }o--o| User : "pendingAdopter"
    Pet }o--o| Partner : "partner"
    
    Conversation ||--o{ Message : "contains"
    Conversation ||--o{ ConversationParticipant : "has"
    
    Partner ||--o{ Pet : "pets"
    Partner ||--o{ PartnerMember : "has"
    Partner ||--o{ PartnerCoupon : "has"
    Partner ||--o{ PartnerService : "has"
    Partner ||--o{ PetPartnership : "partners"
    
    User {
        uuid id PK
        string email
        string name
        string username
        string passwordHash
        string document
        string kycStatus
    }
    
    Pet {
        uuid id PK
        string name
        string species
        string status
        string publicationStatus
        uuid ownerId FK
        uuid partnerId FK
    }
    
    Conversation {
        uuid id PK
        uuid petId FK
        uuid adopterId FK
        string type
    }
    
    Adoption {
        uuid id PK
        uuid petId FK
        uuid tutorId FK
        uuid adopterId FK
        datetime adoptedAt
    }
    
    Partner {
        uuid id PK
        string type
        string name
        string slug
        uuid userId FK
    }
```

---

## Arquitetura da API (camadas)

```mermaid
flowchart TB
    subgraph Client["Cliente (Mobile)"]
        A[Expo App]
    end
    
    subgraph API["API NestJS"]
        B[Controllers]
        C[Guards / Pipes]
        D[Services]
        E[PrismaService]
    end
    
    subgraph External["Externos"]
        F[(PostgreSQL)]
        G[S3 / MinIO]
        H[Stripe]
        I[Email SMTP]
    end
    
    A -->|"HTTPS REST"| B
    B --> C
    C --> D
    D --> E
    E --> F
    D --> G
    D --> H
    D --> I
```

---

## Fluxo de dados — Login

```mermaid
sequenceDiagram
    participant M as Mobile
    participant A as AuthController
    participant S as AuthService
    participant P as Prisma
    participant DB as PostgreSQL
    
    M->>A: POST /auth/login
    A->>S: login(dto)
    S->>P: user.findUnique(email)
    P->>DB: SELECT
    DB-->>P: user
    P-->>S: user
    S->>S: bcrypt.compare(password)
    S->>S: jwtService.sign(access)
    S->>S: jwtService.sign(refresh)
    S->>P: refreshToken.create
    S-->>A: { accessToken, refreshToken }
    A-->>M: 200 OK + tokens
    M->>M: SecureStore.setItem(tokens)
```

---

## Fluxo de dados — Feed

```mermaid
flowchart LR
    subgraph Mobile
        A[FeedScreen]
        B[useQuery]
        C[getFeed]
    end
    
    subgraph API
        D[FeedController]
        E[FeedService]
        F[MatchEngine]
        G[Prisma]
    end
    
    subgraph DB
        H[(Pet)]
        I[(Swipe)]
        J[(User)]
    end
    
    A --> B
    B --> C
    C -->|GET /feed| D
    D --> E
    E --> F
    E --> G
    G --> H
    G --> I
    G --> J
```

---

## Módulos da API

```mermaid
mindmap
  root((API))
    Auth
      login
      signup
      refresh
      logout
    Feed
      getFeed
      getMapPins
    Pets
      CRUD
      adoções
      match score
    Swipes
      like
      pass
    Favorites
      add
      remove
      list
    Chat
      Conversations
      Messages
    Me
      perfil
      preferências
      KYC
      parceiro
    Admin
      moderação
      stats
    Partners
      list
      cupons
      serviços
```

---

**Nota:** No GitHub, os blocos Mermaid são renderizados automaticamente. Em outros viewers Markdown, use um editor que suporte Mermaid (VS Code com extensão, Obsidian, etc.) ou um gerador de diagramas online.
