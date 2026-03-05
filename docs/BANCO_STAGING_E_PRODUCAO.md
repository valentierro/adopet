# Base de dados: Staging vs Produção (Neon)

## Recomendação: duas bases

- **Produção:** uma base **só para produção** (dados reais, usuários, anúncios). Usada pela API em produção (Vercel).
- **Staging (ou dev):** a base que você usa hoje pode virar **staging** — para testar migrações, seeds e deploys antes de aplicar em produção.

**Por quê separar?**

| Um único banco + limpeza | Duas bases (staging + prod) |
|--------------------------|----------------------------|
| Qualquer migração/seed roda direto em prod | Migrações e seeds são testadas em staging antes de prod |
| Risco de script errado ou “limpeza” afetar usuários reais | Produção isolada; você pode resetar/limpar staging à vontade |
| Difícil testar rollback de migration | Dá para testar migration em staging e só depois rodar em prod |

**Conclusão:** vale a pena criar uma **base nova para produção** e usar a atual como staging (ou manter a atual como prod e criar uma nova para staging — o importante é ter as duas).

---

## Passos no Neon

1. **Acesse o [Neon Console](https://console.neon.tech).**
2. **Criar a base de produção:**
   - Se hoje você tem um **projeto** com uma base só: crie um **novo projeto** (ex.: `adopet-prod`) e use a connection string desse projeto como `DATABASE_URL` de **produção**.
   - Ou, no mesmo projeto, crie um **novo branch** (ex.: `main` para prod e `staging` para testes) e use a connection string de cada branch.
3. **Copie a connection string** da base que será **produção** (com SSL, ex.: `?sslmode=require`).

---

## Aplicar schema em produção (uma vez)

**Se a base de produção é nova e vazia** (nunca rodou migrations antes), as migrations incrementais do projeto assumem que tabelas como `Partner` já existem. Use o **baseline** (schema completo + marcar migrations como aplicadas):

```bash
# Na raiz do monorepo, com DATABASE_URL apontando para a base de PRODUÇÃO
DATABASE_URL="postgresql://..." ./scripts/baseline-prod-db.sh
```

O script faz: `prisma db push` (cria todas as tabelas a partir do `schema.prisma`) e em seguida marca as 14 migrations como já aplicadas. Depois disso, use sempre `prisma migrate deploy` para novas migrations.

**Se a base já tem o schema** (por exemplo, você rodou o baseline antes ou restaurou um backup), use apenas:

```bash
cd apps/api
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Não rode `prisma db seed` em prod a menos que seja um seed específico e controlado (ex.: um usuário admin inicial).

---

## Configurar a Vercel (API)

1. **Settings → Environment Variables** do projeto da API.
2. Para o ambiente **Production**, defina (ou atualize):
   - `DATABASE_URL` = connection string da **base de produção** (a nova).
3. Faça um **redeploy** da API para passar a usar a nova base.

---

## Uso do dia a dia

- **Staging (base antiga):** use no seu `.env` local ou em um ambiente de preview na Vercel para testar migrações e seeds. Pode limpar/resetar quando precisar.
- **Produção (base nova):** só a API em produção (Vercel) usa. Migrations: rodar `migrate deploy` com `DATABASE_URL` de prod quando uma release for para produção.

Se quiser, podemos depois documentar um “checklist de release” (rodar migrate em staging → validar → rodar migrate em prod → deploy API).
