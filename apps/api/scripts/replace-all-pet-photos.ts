/**
 * Substitui todas as fotos de pets no banco por URLs de gatos (loremflickr) ou cachorros (place.dog),
 * conforme a espécie do pet — aleatório dentro de cada lista.
 *
 * Uso:
 *   cd apps/api
 *   pnpm run db:replace-all-pet-photos
 */
const pathJoin = require('path').join;
const pathResolve = require('path').resolve;
const scriptRoot = pathResolve(__dirname, '..');
const scriptNodeEnv = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: pathJoin(scriptRoot, '.env') });
require('dotenv').config({ path: pathJoin(scriptRoot, `.env.${scriptNodeEnv}`) });
const { PrismaClient } = require('../api/prisma-generated');

const prisma = new PrismaClient();

/** Gatos: loremflickr.com (lock 101–120). */
const CAT_URLS = Array.from({ length: 20 }, (_, i) => `https://loremflickr.com/800/600/cat?lock=${101 + i}`);

/** Cachorros: place.dog (id 1–20). */
const DOG_URLS = Array.from({ length: 20 }, (_, i) => `https://place.dog/800/600?id=${i + 1}`);

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const allMedia = await prisma.petMedia.findMany({
    include: { pet: { select: { name: true, species: true } } },
    orderBy: [{ petId: 'asc' }, { sortOrder: 'asc' }],
  });

  if (allMedia.length === 0) {
    console.log('Nenhuma foto de pet no banco.');
    return;
  }

  console.log(`Substituindo ${allMedia.length} foto(s) por URL de gato ou cachorro conforme espécie...`);

  for (const m of allMedia) {
    const pet = m.pet;
    const species = pet ? String(pet.species).toUpperCase() : 'DOG';
    const urls =
      species === 'CAT' ? CAT_URLS : species === 'DOG' ? DOG_URLS : [...CAT_URLS, ...DOG_URLS];
    const newUrl = pickRandom(urls);
    await prisma.petMedia.update({
      where: { id: m.id },
      data: { url: newUrl },
    });
    console.log(`  ${pet ? `${pet.name} (${pet.species})` : m.id} → ${newUrl}`);
  }

  console.log(`Pronto. ${allMedia.length} foto(s) atualizada(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
