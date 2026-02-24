/**
 * Atribui uma foto de pet aleatória (URLs externas) a todos os pets que não têm nenhuma mídia.
 * Funciona em qualquer ambiente (local + prod). Uso: pnpm run db:assign-placeholder-photos
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

/** URL de placeholder que carrega (picsum.photos). Determinístico por espécie + petId. */
function placeholderPhotoUrl(species: string, petId: string): string {
  const safe = String(petId).replace(/[^a-zA-Z0-9-]/g, '');
  const seed = (species === 'DOG' ? 'dog-' : 'cat-') + (safe || 'pet');
  return `https://picsum.photos/seed/${seed}/400/400`;
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
    const url = placeholderPhotoUrl(pet.species, pet.id);
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
