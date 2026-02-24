# Plano: Portal de Administração Web – Adopet

## 1. Objetivo

Criar um painel administrativo **web** que:
- Replique todas as funções da área de administração do **app mobile**, com UX adequada a desktop.
- Ofereça **mais recursos** (filtros, listagens completas, exportação, métricas visuais).
- Seja acessado por **subdomínio** de appadopet.com.br (ex.: **admin.appadopet.com.br** ou **painel.appadopet.com.br**).

---

## 2. Subdomínio e infraestrutura

| Item | Proposta |
|------|----------|
| **URL** | `https://admin.appadopet.com.br` (ou `painel.appadopet.com.br`) |
| **Hospedagem** | Vercel (recomendado: deploy automático por Git, SSL, subdomínio fácil) ou mesmo host da landing, em pasta/subdomínio |
| **DNS** | Registrar CNAME `admin` (ou `painel`) apontando para o provedor do front (ex.: `cname.vercel-dns.com` se for Vercel) |
| **API** | Mesma API atual (NestJS). O portal consome os endpoints já existentes em `/v1/admin/*`, `/v1/pets/pending`, `/v1/reports`, `/v1/verification/admin/*`, etc. **Nenhuma variável nova na API** para o portal; apenas CORS liberando o domínio do admin. |

---

## 3. Autenticação

- **Login:** tela de login (e-mail + senha) que chama `POST /v1/auth/login` da API.
- **Token:** a API devolve JWT; o portal guarda (ex.: `localStorage` ou cookie httpOnly se houver backend de sessão).
- **Autorização:** todas as requisições admin usam `Authorization: Bearer <token>`; a API já restringe com `JwtAuthGuard` + `AdminGuard` (usuário deve ter `isAdmin: true`).
- **Proteção de rotas:** no front, checar se há token e se o usuário é admin; caso contrário, redirecionar para login.
- **Logout:** remover token e redirecionar para a tela de login.

*(O app já define admin por usuário no banco; a API não precisa de mudança de modelo.)*

---

## 4. Funcionalidades (espelho do app + extensões)

### 4.1 Dashboard (início)

- **Cards de resumo** (como no app):
  - Total de adoções
  - Adoções este mês
  - Anúncios pendentes
  - Verificações pendentes
  - Denúncias abertas
  - Pets “marcados como adotados” pelo tutor (aguardando confirmação)
  - Parceiros (total)
  - Indicações de parceiros
  - Reports de bugs (beta)
- **Extras web:**
  - Gráfico simples (ex.: adoções por mês nos últimos 6–12 meses) — exige endpoint novo opcional ou cálculo no front com dados existentes.
  - Links rápidos para cada seção do painel.

### 4.2 Anúncios pendentes (publicação no feed)

- Listar pets com `publicationStatus === 'PENDING'` (endpoint existente: `GET /v1/pets/pending`).
- Exibir: foto, nome, tutor, data; ações “Aprovar” e “Rejeitar”.
- **Ações em lote:** seleção múltipla e aprovar/rejeitar vários (API já suporta por pet; no front agrupar chamadas `PATCH /v1/pets/:id/publication`).
- **Extras web:** filtro por data, busca por nome do pet ou tutor (se a API passar a aceitar query params; senão, filtrar no front).

### 4.3 Verificações (selo “Verificado”)

- **Pendentes:** listar (GET existente), aprovar ou rejeitar cada uma (PUT existente).
- **Aprovadas:** listar (GET existente), revogar (PUT existente).
- **Extras web:** filtro por tipo (usuário vs pet), data.

### 4.4 Denúncias (reports)

- Listar denúncias abertas e resolvidas (GET existente).
- Abrir detalhe: denunciante, alvo (pet/usuário/mensagem), motivo, descrição, data.
- Ação “Resolver” com feedback opcional para o denunciante (PUT existente).
- **Extras web:** filtro por tipo de alvo, status (aberta/resolvida), data; ordenação.

### 4.5 Adoções

- **Listagem:** todas as adoções registradas (GET existente), com tutor, adotante, pet, data, status (confirmada pela Adopet ou não).
- **Registrar adoção:** formulário “Pet + Adotante” (busca de usuário existente), chamar `POST /v1/admin/adoptions`.
- **Confirmar / Rejeitar pela Adopet:** por item, chamar endpoints existentes.
- **Extras web:** filtro por período, por tutor/adotante (busca), exportar lista (CSV).

### 4.6 Pets marcados como adotados pelo tutor

- Listar itens retornados por `GET /v1/admin/pending-adoptions-by-tutor`.
- Para cada item: ver anúncio (link para pet no app ou futuro link web), ver perfil do tutor (link ou modal com dados da API admin).
- Ações: “Confirmar adoção” (cria registro e pode marcar confirmado pela Adopet conforme fluxo atual), “Rejeitar marcação” (endpoint existente).
- **Ações em lote:** confirmar ou rejeitar vários (no front, múltiplas chamadas).
- **Extras web:** ordenar por data; indicar countdown para auto-aprovação (48h).

### 4.7 Parceiros (ONG, clínicas, lojas)

- Listar parceiros (GET existente).
- Cadastrar novo parceiro (POST existente): tipo, nome, slug, cidade, descrição, site, logo, contato, ativo, aprovado, parceiro pago.
- Editar / aprovar parceiro (PATCH existente).
- **Extras web:** filtro por tipo (ONG/CLINIC/STORE), status (ativo/aprovado); ordenação; exibir logo.

### 4.8 Indicações de parceiros

- Listar indicações (GET existente): quem indicou, nome/ tipo/cidade/contato do indicado, mensagem, data.
- **Extras web:** usar como “fila” para criar parceiro; botão “Criar parceiro a partir desta indicação” (preencher formulário com os dados).

### 4.9 Reports de bugs (beta)

- Listar reports (GET existente): usuário, tipo, mensagem, stack, tela, comentário, data.
- **Extras web:** filtro por data; marcar como “lido” ou “resolvido” se no futuro a API tiver esse campo (opcional).

---

## 5. Funcionalidades “a mais” em relação ao app

| Recurso | Descrição |
|---------|-----------|
| **Listagem de usuários** | Busca por nome/e-mail (já existe `GET /admin/users?search=`). Tela com tabela; opcional: ver detalhes (pets, adoções). Futuro: desativar conta (se a API permitir). |
| **Listagem de pets (avançada)** | Listar pets com filtros (status, publicação, tutor, espécie). Depende de endpoint novo (ex.: `GET /admin/pets?status=...&publicationStatus=...`) ou uso de dados já existentes. |
| **Exportação** | Exportar adoções, denúncias ou parceiros em CSV (no front, a partir dos dados já carregados). |
| **Métricas / gráficos** | Adoções por mês; pets aprovados/rejeitados por período. Pode exigir endpoint agregado (ex.: `GET /admin/stats/history`) ou cálculo no front. |
| **Auditoria / logs** | (Futuro) Se a API passar a registrar “quem aprovou/rejeitou o quê e quando”, exibir em lista no portal. |

---

## 6. Stack técnica sugerida (portal web)

| Camada | Sugestão | Motivo |
|--------|----------|--------|
| **Framework** | React 18+ com Vite | Rápido, simples, consistente com a landing; SPA é suficiente. |
| **Roteamento** | React Router v6 | Rotas para login, dashboard, anúncios, verificações, denúncias, adoções, parceiros, etc. |
| **Requisições / cache** | TanStack Query (React Query) | Reuso da mesma mentalidade do app; cache, refetch, estados de loading/erro. |
| **UI / componentes** | Tailwind CSS + componentes mínimos (ou um kit leve: shadcn/ui, DaisyUI, ou só Tailwind) | Alinhado à landing; rápido de estilizar tabelas, cards, formulários. |
| **Formulários** | React Hook Form + validação (Zod ou Yup) | Formulários de login, registro de adoção, parceiro, etc. |
| **Build / deploy** | Vite build → deploy na Vercel (ou no mesmo host da landing) | Build leve; subdomínio simples. |

*(Alternativa: Next.js App Router se quiser SSR/SEO para telas públicas no futuro; para painel 100% atrás de login, Vite + React é suficiente.)*

---

## 7. Estrutura de pastas sugerida (monorepo)

```
apps/
  admin-web/                 # novo app
    index.html
    package.json
    vite.config.ts
    public/
    src/
      main.tsx
      App.tsx
      api/                   # client HTTP para a API (baseURL = env)
        client.ts
        auth.ts
        admin.ts             # reexportar chamadas admin
      routes/
        Root.tsx
        Login.tsx
        Dashboard.tsx
        PendingPets.tsx
        Verifications.tsx
        Reports.tsx
        Adoptions.tsx
        PendingAdoptionsByTutor.tsx
        Partners.tsx
        PartnerRecommendations.tsx
        BugReports.tsx
        Users.tsx             # extra
      components/
        Layout.tsx            # sidebar + header + outlet
        Sidebar.tsx
        StatCard.tsx
        DataTable.tsx
        ...
      hooks/
        useAuth.ts
      ...
    .env.example              # VITE_API_URL=https://sua-api.vercel.app/v1
```

- **API base URL:** variável de ambiente no front (ex.: `VITE_API_URL`). Em produção, apontar para a API em produção (ex.: `https://api.appadopet.com.br/v1` ou a URL que já usam).
- **CORS:** na API, garantir que o domínio `https://admin.appadopet.com.br` (e, em dev, `http://localhost:5173`) esteja permitido.

---

## 8. Segurança e boas práticas

- **HTTPS:** obrigatório no subdomínio (Vercel/host já costumam fornecer).
- **Token:** não expor em URL; enviar só no header `Authorization`. Se usar localStorage, considerar risco de XSS e mitigar (conteúdo seguro, CSP).
- **CORS:** liberar apenas origens confiáveis (admin e, em dev, localhost).
- **Sessão:** definir tempo de inatividade ou expiração do JWT; ao 401, redirecionar para login.
- **Admin:** a API já garante que só `isAdmin` acessa rotas admin; o front só melhora a UX (não mostrar opções que não existem para não-admin).

---

## 9. Fases de implementação sugeridas

| Fase | Escopo | Entregável |
|------|--------|------------|
| **1** | Setup do projeto (Vite, React, Router, Tailwind), tela de login, layout (sidebar + área principal), integração com API (client + auth). | Acesso ao subdomínio com login e dashboard com cards de resumo (dados reais). |
| **2** | Anúncios pendentes, Verificações (pendentes + aprovadas), Denúncias. | Todas as ações do app nessas áreas disponíveis no web, com listagens e ações em lote onde fizer sentido. |
| **3** | Adoções (listar, registrar, confirmar/rejeitar), Pets marcados como adotados pelo tutor (listar, confirmar, rejeitar). | Fluxo completo de adoções e “marcados pelo tutor” no portal. |
| **4** | Parceiros (CRUD), Indicações de parceiros, Reports de bugs. | Gestão de parceiros e filas de indicação/bugs. |
| **5** | Extras: listagem de usuários, exportação CSV, filtros avançados, gráficos simples (se houver endpoint ou dados suficientes). | Portal “mais completo” que o app. |

---

## 10. Checklist antes de começar

- [ ] Definir subdomínio exato: `admin.appadopet.com.br` ou `painel.appadopet.com.br`.
- [ ] Decidir hospedagem do front (Vercel recomendado).
- [ ] Garantir CORS na API para o domínio do admin (e localhost em dev).
- [ ] Confirmar que existe ao menos um usuário admin no banco (ex.: `admin-teste@adopet.com.br` com `isAdmin: true`).
- [ ] Criar repositório ou pasta `apps/admin-web` no monorepo e configurar build/deploy.

---

## 11. Resumo

- **O quê:** portal web administrativo em **admin.appadopet.com.br** (ou painel), com tudo que o app admin tem + listagens melhores, filtros, exportação e possíveis métricas.
- **API:** mesma API NestJS; apenas CORS para o novo domínio.
- **Auth:** login com e-mail/senha (JWT); mesmo critério de admin (isAdmin) no backend.
- **Stack:** React + Vite + React Router + TanStack Query + Tailwind (e opcionalmente um kit de componentes).
- **Deploy:** build estático (Vite) no subdomínio; variável `VITE_API_URL` para a API em produção.

Com esse plano, a próxima etapa é a **Fase 1**: criar o app `admin-web`, tela de login, layout e dashboard com os cards de resumo consumindo a API atual.
