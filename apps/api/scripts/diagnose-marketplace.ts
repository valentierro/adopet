/**
 * Diagnóstico: por que o marketplace pode estar vazio.
 * Mostra contagens de parceiros por critério.
 * Uso: pnpm run db:diagnose-marketplace
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();
const now = new Date();

async function main() {
  const totalPartners = await prisma.partner.count();
  const activePartners = await prisma.partner.count({ where: { active: true } });
  const withApprovedAt = await prisma.partner.count({ where: { active: true, approvedAt: { not: null } } });
  const withActivatedAt = await prisma.partner.count({ where: { active: true, activatedAt: { not: null } } });
  const paidPartners = await prisma.partner.count({ where: { active: true, isPaidPartner: true } });

  const withActiveServices = await prisma.partner.count({
    where: {
      active: true,
      services: {
        some: {
          active: true,
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      },
    },
  });

  const withActiveCoupons = await prisma.partner.count({
    where: {
      active: true,
      coupons: {
        some: {
          active: true,
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      },
    },
  });

  const totalServices = await prisma.partnerService.count({
    where: {
      active: true,
      OR: [{ validUntil: null }, { validUntil: { gte: now } }],
    },
  });

  const totalCoupons = await prisma.partnerCoupon.count({
    where: {
      active: true,
      OR: [{ validUntil: null }, { validUntil: { gte: now } }],
    },
  });

  const marketplaceEligible = await prisma.partner.count({
    where: {
      active: true,
      OR: [
        { approvedAt: { not: null } },
        { isPaidPartner: true },
        { activatedAt: { not: null } },
      ],
    },
  });

  const marketplaceWithOffers = await prisma.partner.findMany({
    where: {
      active: true,
      OR: [
        { approvedAt: { not: null } },
        { isPaidPartner: true },
        { activatedAt: { not: null } },
      ],
    },
    include: {
      services: {
        where: {
          active: true,
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      },
      coupons: {
        where: {
          active: true,
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      },
    },
  });

  const withServicesOrCoupons = marketplaceWithOffers.filter((p) => p.services.length > 0 || p.coupons.length > 0);

  console.log('--- Diagnóstico Marketplace ---\n');
  console.log('Parceiros totais:', totalPartners);
  console.log('Parceiros ativos (active=true):', activePartners);
  console.log('  → com approvedAt:', withApprovedAt);
  console.log('  → com activatedAt (já acessou portal):', withActivatedAt);
  console.log('  → isPaidPartner:', paidPartners);
  console.log('');
  console.log('Parceiros com pelo menos 1 serviço ativo e válido:', withActiveServices);
  console.log('Parceiros com pelo menos 1 cupom ativo e válido:', withActiveCoupons);
  console.log('Total de serviços ativos no sistema:', totalServices);
  console.log('Total de cupons ativos no sistema:', totalCoupons);
  console.log('');
  console.log('Parceiros elegíveis ao marketplace (aprovado OU pago OU activatedAt):', marketplaceEligible);
  console.log('Desses, com pelo menos 1 serviço ou 1 cupom:', withServicesOrCoupons.length);
  console.log('');

  if (withServicesOrCoupons.length === 0) {
    console.log('→ Nenhum parceiro elegível tem serviços/cupons. Para aparecer no marketplace:');
    console.log('  1) Parceiro precisa estar active=true e (approvedAt preenchido OU isPaidPartner OU activatedAt);');
    console.log('  2) Ter pelo menos um serviço ou cupom com active=true e validUntil nulo ou futuro.');
    if (totalServices + totalCoupons === 0) {
      console.log('  → Não há serviços nem cupons ativos no banco. Cadastre no portal do parceiro.');
    }
  } else {
    console.log('Parceiros que deveriam aparecer no marketplace:');
    withServicesOrCoupons.forEach((p) => {
      console.log(`  - ${p.name} (${p.type}): ${p.services.length} serviço(s), ${p.coupons.length} cupom(ns)`);
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
