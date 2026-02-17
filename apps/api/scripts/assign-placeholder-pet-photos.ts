/**
 * Atribui uma foto de pet aleatória (URLs externas) a todos os pets que não têm nenhuma mídia.
 * Funciona em qualquer ambiente (local + prod). Uso: pnpm run db:assign-placeholder-photos
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

function placeholderPhotoUrl(species: string): string {
  const size = 400 + Math.floor(Math.random() * 5);
  if (species === 'DOG') return `https://placedog.net/${size}/${size}?id=${Date.now()}`;
  return `https://placekitten.com/${size}/${size}?id=${Date.now()}`;
}

async function main() {
  const petsWithoutPhoto = await prisma.pet.findMany({
    where: { media: { none: {} } },
    select: { id: true, name: true, species: true },
  });

  if (petsWithoutPhoto.length === 0) {
    console.log('Nenhum pet sem foto encontrado.');
    return;
  }

  console.log(`Encontrados ${petsWithoutPhoto.length} pet(s) sem foto. Atribuindo imagem aleatória...`);

  for (const pet of petsWithoutPhoto) {
    const url = placeholderPhotoUrl(pet.species);
    await prisma.petMedia.create({
      data: {
        petId: pet.id,
        url,
        sortOrder: 0,
        isPrimary: true,
      },
    });
    console.log(`  ${pet.name} (${pet.species}) → ${url}`);
  }

  console.log(`Pronto. ${petsWithoutPhoto.length} pet(s) atualizado(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
