/**
 * Define approvedAt para parceiros ativos que têm serviços ou cupons ativos
 * mas ainda não tinham approvedAt. Assim passam a aparecer no marketplace e na lista pública.
 * Uso: pnpm run db:backfill-partner-approved-for-marketplace
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

const now = new Date();

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      active: true,
      approvedAt: null,
      OR: [
        {
          services: {
            some: {
              active: true,
              OR: [{ validUntil: null }, { validUntil: { gte: now } }],
            },
          },
        },
        {
          coupons: {
            some: {
              active: true,
              OR: [{ validUntil: null }, { validUntil: { gte: now } }],
            },
          },
        },
      ],
    },
    select: { id: true, name: true, type: true },
  });

  if (partners.length === 0) {
    console.log('Nenhum parceiro pendente de aprovação com serviços ou cupons ativos.');
    return;
  }

  console.log(`Encontrados ${partners.length} parceiro(s) com ofertas e sem approvedAt. Definindo approvedAt = now()...`);

  for (const p of partners) {
    await prisma.partner.update({
      where: { id: p.id },
      data: { approvedAt: now },
    });
    console.log(`  ${p.name} (${p.type}) – ${p.id}`);
  }

  console.log(`Concluído: ${partners.length} parceiro(s) aprovados para exibição no marketplace.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
