/**
 * Corrige URLs de fotos de pets que não exibem:
 * - localhost, 127.0.0.1, /v1/seed-photos/ (não carregam em produção)
 * - placedog.net, placekitten.com (podem falhar por CORS ou indisponibilidade)
 * Substitui por picsum.photos (determinístico por pet/media) que costuma carregar bem.
 * Uso: pnpm run db:fix-seed-photo-urls
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

function isBrokenOrUnreliablePhotoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('localhost') ||
    u.includes('127.0.0.1') ||
    u.includes('/v1/seed-photos/') ||
    u.includes('placedog.net') ||
    u.includes('placekitten.com')
  );
}

/** URL de placeholder que costuma carregar (picsum.photos, seed fixo por petId+mediaId). */
function reliablePlaceholderUrl(petId: string, mediaId: string): string {
  const seed = `${petId}-${mediaId}`.replace(/[^a-zA-Z0-9-]/g, '');
  return `https://picsum.photos/seed/${seed || 'pet'}/400/400`;
}

async function main() {
  const allMedia = await prisma.petMedia.findMany({
    include: { pet: { select: { name: true, species: true } } },
  });
  const toFix = allMedia.filter((m) => isBrokenOrUnreliablePhotoUrl(m.url));

  if (toFix.length === 0) {
    console.log('Nenhuma URL de foto quebrada ou não confiável encontrada.');
    return;
  }

  console.log(`Encontradas ${toFix.length} foto(s) com URL quebrada ou não confiável. Corrigindo...`);

  for (const m of toFix) {
    const newUrl = reliablePlaceholderUrl(m.petId, m.id);
    await prisma.petMedia.update({
      where: { id: m.id },
      data: { url: newUrl },
    });
    console.log(`  ${m.pet.name} (${m.pet.species}) media ${m.id} → ${newUrl}`);
  }

  console.log(`Pronto. ${toFix.length} URL(s) atualizada(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
