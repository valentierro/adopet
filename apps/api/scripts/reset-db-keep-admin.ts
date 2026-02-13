/**
 * Apaga todos os dados do banco EXCETO as contas de admin.
 * Admin = usuários cujo ID está em ADMIN_USER_IDS (variável de ambiente).
 *
 * Uso (com banco de produção):
 *   cd apps/api
 *   DATABASE_URL="sua-url-producao" ADMIN_USER_IDS="uuid-do-admin" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reset-db-keep-admin.ts
 *
 * Ou com .env de produção carregado:
 *   pnpm run db:reset-keep-admin
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

function getAdminIds(): string[] {
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw?.trim()) {
    throw new Error('Defina ADMIN_USER_IDS no ambiente (ex: ADMIN_USER_IDS="uuid-1,uuid-2")');
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const adminIds = getAdminIds();
  console.log('Mantendo apenas os usuários admin:', adminIds);

  // Ordem: tabelas dependentes primeiro (respeitando FKs)
  await prisma.message.deleteMany({});
  await prisma.conversationParticipant.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.swipe.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.adoption.deleteMany({});
  await prisma.petMedia.deleteMany({});
  await prisma.pet.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.bugReport.deleteMany({});
  await prisma.savedSearch.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.userPreferences.deleteMany({});
  await prisma.partnerCoupon.deleteMany({});
  await prisma.partnerService.deleteMany({});
  await prisma.partnerEvent.deleteMany({});
  await prisma.partner.deleteMany({});

  // Remove todos os usuários que NÃO são admin
  const deleted = await prisma.user.deleteMany({
    where: { id: { notIn: adminIds } },
  });
  console.log('Usuários removidos:', deleted.count);

  const kept = await prisma.user.count({ where: { id: { in: adminIds } } });
  console.log('Usuários mantidos (admin):', kept);

  if (kept === 0) {
    console.warn('Atenção: nenhum usuário com ID em ADMIN_USER_IDS foi encontrado. Verifique se o ID está correto no banco.');
  }
}

main()
  .then(() => {
    console.log('Concluído.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
