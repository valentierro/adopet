/**
 * Remove da base os usuários com os e-mails informados.
 * Uso: cd apps/api && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/delete-users-by-email.ts
 * Requer DATABASE_URL no ambiente (ex.: export $(grep -v '^#' .env | xargs) antes no terminal).
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

const EMAILS = ['ovalen507@gmail.com', 'ovalen508@gmail.com'];

async function main() {
  const existing = await prisma.user.findMany({
    where: { email: { in: EMAILS } },
    select: { id: true, email: true, name: true },
  });
  if (existing.length === 0) {
    console.log('Nenhum usuário encontrado com os e-mails:', EMAILS.join(', '));
    return;
  }
  console.log('Removendo usuários:', existing.map((u) => `${u.email} (${u.name})`).join(', '));
  const result = await prisma.user.deleteMany({
    where: { email: { in: EMAILS } },
  });
  console.log('Removido(s):', result.count, 'conta(s).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
