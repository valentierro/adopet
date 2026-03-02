/**
 * Backfill: define partnerId em pets cujo dono é parceiro ONG (owner ou member)
 * e o pet ainda não tem partnerId. Necessário para o botão "Enviar formulário" no chat.
 *
 * Uso: pnpm run db:backfill-pet-partner-id
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

async function main() {
  const [partnerOwners, partnerMembers] = await Promise.all([
    prisma.partner.findMany({ select: { id: true, userId: true } }),
    prisma.partnerMember.findMany({ select: { partnerId: true, userId: true } }),
  ]);

  const userToPartnerId = new Map<string, string>();
  partnerOwners.forEach((p) => {
    if (p.userId) userToPartnerId.set(p.userId, p.id);
  });
  partnerMembers.forEach((m) => {
    userToPartnerId.set(m.userId, m.partnerId);
  });

  const partnerUserIds = Array.from(userToPartnerId.keys());
  if (partnerUserIds.length === 0) {
    console.log('Nenhum parceiro encontrado. Nada a fazer.');
    return;
  }

  const petsToUpdate = await prisma.pet.findMany({
    where: {
      partnerId: null,
      ownerId: { in: partnerUserIds },
      status: { not: 'ADOPTED' },
    },
    select: { id: true, name: true, ownerId: true },
  });

  if (petsToUpdate.length === 0) {
    console.log('Nenhum pet sem partnerId cujo dono é parceiro. Nada a fazer.');
    return;
  }

  console.log(`Encontrados ${petsToUpdate.length} pet(s) sem partnerId cujo dono é parceiro. Atualizando...`);

  let updated = 0;
  for (const pet of petsToUpdate) {
    const partnerId = userToPartnerId.get(pet.ownerId);
    if (!partnerId) continue;
    await prisma.pet.update({
      where: { id: pet.id },
      data: { partnerId },
    });
    updated++;
    console.log(`  Pet "${pet.name}" (${pet.id}): partnerId definido`);
  }

  console.log(`\nBackfill concluído: ${updated} pet(s) atualizado(s) com partnerId.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
