/**
 * Remove da base os usuários cujo e-mail começa com um prefixo informado.
 * As relações em cascata (pets, swipes, favoritos, mensagens, etc.) são removidas pelo banco.
 *
 * Uso (a partir de apps/api):
 *   pnpm run db:delete-users-by-prefix iranselva
 * ou:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/delete-users-by-email-prefix.ts iranselva
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

async function main() {
  const prefix = process.argv
    .slice(2)
    .find((a) => a !== '--' && !a.startsWith('-'))
    ?.trim()
    ?.toLowerCase();
  if (!prefix) {
    console.error('Uso: pnpm run db:delete-users-by-prefix -- <prefixo>');
    console.error('Ex.: pnpm run db:delete-users-by-prefix -- iranselva');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: {
      email: { startsWith: prefix },
    },
    select: { id: true, email: true, name: true },
  });

  // Também busca variante com primeira letra maiúscula (emails podem ter sido salvos assim)
  if (prefix.length > 0) {
    const upper = prefix[0].toUpperCase() + prefix.slice(1);
    if (upper !== prefix) {
      const extra = await prisma.user.findMany({
        where: { email: { startsWith: upper } },
        select: { id: true, email: true, name: true },
      });
      const seen = new Set(users.map((u) => u.id));
      extra.forEach((u) => {
        if (!seen.has(u.id)) {
          users.push(u);
          seen.add(u.id);
        }
      });
    }
  }

  if (users.length === 0) {
    console.log(`Nenhum usuário encontrado com e-mail iniciando em "${prefix}".`);
    return;
  }

  console.log(`Encontrado(s) ${users.length} usuário(s) com e-mail iniciando em "${prefix}":`);
  users.forEach((u) => console.log(`  - ${u.email} (${u.name}, id: ${u.id})`));

  const result = await prisma.user.deleteMany({
    where: { id: { in: users.map((u) => u.id) } },
  });

  console.log(`\nRemovido(s) ${result.count} usuário(s) da base.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
