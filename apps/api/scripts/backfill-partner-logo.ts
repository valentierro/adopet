/**
 * Atribui logo placeholder a parceiros que não têm logoUrl.
 * Útil para anúncios criados antes da implementação de exibir logo do parceiro no app.
 * Execute: cd apps/api && pnpm db:backfill-partner-logo
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

function placeholderLogoUrl(slug: string): string {
  const safe = String(slug).replace(/[^a-zA-Z0-9-]/g, '');
  return `https://picsum.photos/seed/partner-${safe || 'logo'}/200/200`;
}

async function main() {
  const partnersWithoutLogo = await prisma.partner.findMany({
    where: { OR: [{ logoUrl: null }, { logoUrl: '' }] },
    select: { id: true, name: true, slug: true },
  });

  if (partnersWithoutLogo.length === 0) {
    console.log('Nenhum parceiro sem logo encontrado.');
    return;
  }

  console.log(`Encontrados ${partnersWithoutLogo.length} parceiro(s) sem logo. Atribuindo placeholder...`);

  for (const p of partnersWithoutLogo) {
    const logoUrl = placeholderLogoUrl(p.slug);
    await prisma.partner.update({
      where: { id: p.id },
      data: { logoUrl },
    });
    console.log(`  ${p.name} (${p.slug}) → ${logoUrl}`);
  }

  console.log(`Pronto. ${partnersWithoutLogo.length} parceiro(s) atualizado(s) com logo placeholder.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
