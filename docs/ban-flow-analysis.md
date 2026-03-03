# Análise do fluxo de banimento de usuário no Adopet

**Data:** fev/2025  
**Escopo:** API, mobile, admin-web. Apenas análise; sem implementação.

---

## 1. Como está hoje

### 1.1 Formas de “banir”

| Origem | Endpoint / fluxo | O que é gravado no banco |
|--------|-------------------|---------------------------|
| **Ban direto (admin)** | `POST /v1/admin/users/:userId/ban` (body opcional: `{ reason?: string }`) | `User.deactivatedAt = now`, `User.bannedAt = now`, `User.bannedById = adminId`, `User.bannedReason = reason \|\| null` |
| **Ban ao resolver denúncia** | Resolver report com `banReportedUser: true` (admin-web ou app admin) | Apenas `User.deactivatedAt = now`. **Não** preenche `bannedAt`, `bannedById` nem `bannedReason` |

- Em ambos os casos o efeito prático é o mesmo: a conta deixa de poder fazer login e usar o app.
- A diferença é de **auditoria**: no ban direto fica registrado quem baniu e o motivo; no ban via denúncia não.

### 1.2 Onde o ban é acionado na UI

- **Admin-web:** lista de usuários (`/users`) → botão “Banir” com modal (motivo opcional). Denúncias (`/reports`) → ao resolver, checkbox “Banir usuário denunciado” e depois o mesmo fluxo de ban.
- **App (painel admin):** `(tabs)/admin/users.tsx` e `(tabs)/admin/reports.tsx` — mesmo padrão: modal de confirmação, motivo opcional, chamada a `banUser(userId, reason)`.

### 1.3 Regras de negócio

- **Quem não pode ser banido:** usuários cujo `id` está em `ADMIN_USER_IDS` (config). Retorno: `400 - Não é permitido banir um administrador.`
- **Ban direto:** exige usuário existente; senão `404 - Usuário não encontrado.`

### 1.4 Efeito do ban (conta com `deactivatedAt` preenchido)

- **Login** (`POST /v1/auth/login`): rejeitado com `401 - Conta desativada. Entre em contato para reativar.`
- **Refresh** (`POST /v1/auth/refresh`): token é removido e retorna `401 - Conta desativada.`
- **Validação JWT** (qualquer rota protegida): `JwtStrategy` carrega o user e, se `deactivatedAt` estiver setado, lança `401 - Conta desativada.` (o usuário já logado é “derrubado” em qualquer requisição).
- **Esqueci minha senha:** não envia e-mail; resposta genérica (“Se esse e-mail estiver cadastrado…”). Ou seja, usuário banido não consegue redefinir senha.
- **Alterar senha** (logado): `401 - Conta desativada ou sem senha definida.`
- **Cadastro (signup):** e-mail, username, telefone e documento continuam únicos. Ou seja, **não** é possível criar nova conta com os mesmos dados de um usuário banido (evita reuso imediato para “driblar” o ban).

### 1.5 Desativação voluntária (não é ban)

- **Me/desativar** (`POST /v1/me/deactivate`): o próprio usuário desativa a conta (LGPD). A API seta `deactivatedAt`, anonimiza dados (e-mail, nome, username, telefone, etc.), remove tokens, favoritos, swipes, anonimiza mensagens. **Não** preenche `bannedAt`/`bannedById`/`bannedReason`. Ou seja, no banco fica indistinguível de um “ban por denúncia” (que também só seta `deactivatedAt`).

### 1.6 Remover o ban (desbanir)

- **Não existe** endpoint, tela ou fluxo para desbanir.
- A única forma de “reativar” hoje é alteração manual no banco (por exemplo, `UPDATE "User" SET "deactivatedAt" = NULL, "bannedAt" = NULL, "bannedById" = NULL, "bannedReason" = NULL WHERE id = ?`).

---

## 2. Modelo de dados (Prisma)

```prisma
model User {
  // ...
  deactivatedAt DateTime? // soft delete: conta desativada (auto ou banido por admin)
  bannedAt      DateTime? // quando admin aplicou ban (sem denúncia ou direto)
  bannedById    String?   // id do admin que baniu
  bannedReason  String?  @db.Text // motivo opcional do ban
  // ...
}
```

- Toda conta “desligada” (ban ou desativação voluntária) usa `deactivatedAt`.
- `bannedAt`/`bannedById`/`bannedReason` só existem quando o ban foi aplicado pelo **ban direto** (admin). Ban via denúncia e desativação voluntária não preenchem esses campos.

---

## 3. Experiência no app (mobile)

- **Login:** a API devolve `401` com mensagem “Conta desativada. Entre em contato para reativar.”. O `getFriendlyErrorMessage` do mobile **não** tem caso específico para “conta desativada”; a mensagem cai no genérico de credenciais (`/unauthorized|...|401/`). Resultado: o usuário tende a ver **“E-mail ou senha incorretos”** em vez da mensagem real.
- **Usuário já logado quando é banido:** na próxima requisição autenticada o JWT falha com “Conta desativada.”; o client trata 401 e pode disparar logout/sessão expirada. Dependendo do fluxo, a mensagem exibida pode ser genérica (“Sessão expirada” / “E-mail ou senha incorretos”) em vez de “Conta desativada”.

---

## 4. Resumo dos achados

| Aspecto | Situação atual |
|--------|-----------------|
| Ban direto (admin) | Implementado; grava `deactivatedAt` + `bannedAt`/`bannedById`/`bannedReason`. |
| Ban ao resolver denúncia | Só seta `deactivatedAt`; perde auditoria (quem baniu, motivo). |
| Desbanir | Não existe; só via banco. |
| Mensagem no login (conta desativada) | API correta; app pode mostrar “E-mail ou senha incorretos” por falta de mapeamento. |
| Reuso de e-mail/telefone/documento | Bloqueado no signup (unicidade); adequado para evitar evasão com os mesmos dados. |

---

## 5. Sugestões de melhoria (sem implementar)

### 5.1 Desbanir (prioridade alta)

- **API:** novo endpoint, por exemplo `POST /v1/admin/users/:userId/unban` (ou `PATCH .../users/:userId` com body `{ reactivate: true }`), restrito a admin.
- **Comportamento sugerido:** setar `deactivatedAt = null`, `bannedAt = null`, `bannedById = null`, `bannedReason = null`. Opcional: registrar em log/auditoria “usuário X desbanido por admin Y em Z”.
- **Admin-web e app admin:** na lista de usuários, para linhas com `deactivatedAt` (e idealmente `bannedAt`) preenchido, exibir botão “Desbanir” / “Reativar conta” que chame esse endpoint. Evitar desbanir para usuários que só se desativaram (opcional: mostrar “Desbanir” só quando `bannedAt` estiver preenchido).

### 5.2 Auditoria no ban por denúncia (prioridade média)

- Ao resolver denúncia com `banReportedUser: true`, além de `deactivatedAt` preencher também `bannedAt`, `bannedById` e, se possível, `bannedReason` (ex.: “Ban via denúncia #&lt;reportId&gt;” ou texto livre do admin). Assim fica possível distinguir “ban por denúncia” de “desativação voluntária” e manter rastro de quem aplicou o ban.

### 5.3 Mensagem no app para conta desativada (prioridade média)

- No `getFriendlyErrorMessage` (mobile), incluir um caso **antes** do genérico de 401/credenciais, por exemplo: se a mensagem da API contiver “conta desativada” ou “desativada”, retornar algo como: “Sua conta foi desativada. Entre em contato com o suporte para reativar.” Assim o usuário banido (ou desativado) vê a razão correta no login.

### 5.4 (Opcional) Diferenciar desativação voluntária de ban

- Hoje desativação voluntária só seta `deactivatedAt`. Se no futuro quiser tratar “desativação a pedido” diferente de “ban” (ex.: reativar só com fluxo de suporte no primeiro caso), pode-se usar um campo extra (ex.: `deactivationType: 'USER_REQUEST' | 'ADMIN_BAN'`) ou convenção (ex.: só considerar “ban” quando `bannedAt` estiver preenchido). Não é obrigatório para o fluxo atual de desbanir.

### 5.5 Exibição na lista de usuários (admin)

- Deixar explícito na UI: “Banido em DD/MM/AAAA – motivo: …” quando houver `bannedAt`/`bannedReason`; e “Desativado em DD/MM” quando houver só `deactivatedAt` (desativação voluntária ou ban antigo por denúncia). Facilita decisão de “Desbanir” vs “Reativar conta”.

---

## 6. Conclusão

O fluxo atual de banimento **bloqueia bem** o uso da conta (login, refresh, JWT, recuperação de senha) e **impede** novo cadastro com os mesmos e-mail, username, telefone e documento. O que falta é: **(1)** poder **desbanir** pela API e pela interface admin; **(2)** **auditoria** no ban por denúncia (bannedAt/bannedById/bannedReason); **(3)** **mensagem clara** no app quando o login falha por conta desativada. As sugestões acima podem ser implementadas em etapas (primeiro desbanir + mensagem no app; depois auditoria no ban por denúncia e refinamentos de UI).
