/**
 * Substitui todas as fotos de pets no banco por URLs de cachorros e gatos (aleatório).
 * Use para trocar fotos de paisagem/placeholder por fotos reais de pets.
 *
 * Uso:
 *   cd apps/api
 *   pnpm run db:replace-all-pet-photos
 *
 * Para usar suas próprias 8 URLs (ex.: após upload no S3):
 *   PET_PHOTO_URLS="https://url1.jpg,https://url2.jpg,..." pnpm run db:replace-all-pet-photos
 */
const pathJoin = require('path').join;
const pathResolve = require('path').resolve;
const scriptRoot = pathResolve(__dirname, '..');
const scriptNodeEnv = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: pathJoin(scriptRoot, '.env') });
require('dotenv').config({ path: pathJoin(scriptRoot, `.env.${scriptNodeEnv}`) });
const { PrismaClient } = require('../api/prisma-generated');

const prisma = new PrismaClient();

/**
 * URLs que funcionam no app (picsum.photos permite hotlink; Unsplash pode bloquear em React Native).
 * Use PET_PHOTO_URLS com suas próprias URLs (ex.: S3) se quiser fotos reais.
 */
const DEFAULT_DOG_CAT_URLS = [
  'https://picsum.photos/seed/adopet-dog-1/400/400',
  'https://picsum.photos/seed/adopet-dog-2/400/400',
  'https://picsum.photos/seed/adopet-dog-3/400/400',
  'https://picsum.photos/seed/adopet-cat-1/400/400',
  'https://picsum.photos/seed/adopet-cat-2/400/400',
  'https://picsum.photos/seed/adopet-pet-3/400/400',
  'https://picsum.photos/seed/adopet-pet-4/400/400',
  'https://picsum.photos/seed/adopet-pet-5/400/400',
  'https://picsum.photos/seed/adopet-pet-6/400/400',
  'https://picsum.photos/seed/adopet-pet-7/400/400',
];

function getPhotoUrls(): string[] {
  const env = process.env.PET_PHOTO_URLS?.trim();
  if (env) {
    return env.split(',').map((u) => u.trim()).filter(Boolean);
  }
  return DEFAULT_DOG_CAT_URLS;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main() {
  const urls = getPhotoUrls();
  if (urls.length === 0) {
    console.error('Nenhuma URL configurada. Defina PET_PHOTO_URLS ou use as URLs padrão.');
    process.exit(1);
  }

  const allMedia = await prisma.petMedia.findMany({
    include: { pet: { select: { name: true, species: true } } },
    orderBy: [{ petId: 'asc' }, { sortOrder: 'asc' }],
  });

  if (allMedia.length === 0) {
    console.log('Nenhuma foto de pet no banco.');
    return;
  }

  console.log(`Substituindo ${allMedia.length} foto(s) por uma de ${urls.length} URL(s) (cachorros/gatos)...`);

  for (const m of allMedia) {
    const newUrl = pickRandom(urls);
    await prisma.petMedia.update({
      where: { id: m.id },
      data: { url: newUrl },
    });
    const pet = (m as { pet?: { name: string; species: string } }).pet;
    console.log(`  ${pet ? `${pet.name} (${pet.species})` : m.id} → nova URL`);
  }

  console.log(`Pronto. ${allMedia.length} foto(s) atualizada(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
