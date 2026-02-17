/**
 * Preenche pet.city para todos os pets que já têm latitude/longitude mas city nulo.
 * Usa reverse geocode (Nominatim). Respeita limite de 1 req/s do Nominatim (delay entre chamadas).
 * Uso: pnpm run db:backfill-pet-city
 */
import { PrismaClient } from '../api/prisma-generated';
import { reverseGeocode } from '../src/common/geocoding';

const prisma = new PrismaClient();

const DELAY_MS = 1100; // Nominatim: 1 request per second

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const pets = await prisma.pet.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      city: null,
    },
    select: { id: true, name: true, latitude: true, longitude: true },
  });

  if (pets.length === 0) {
    console.log('Nenhum pet com coordenadas e sem cidade encontrado.');
    return;
  }

  console.log(`Encontrados ${pets.length} pet(s) com lat/lng e city nulo. Preenchendo cidade...`);

  let ok = 0;
  let fail = 0;

  for (const pet of pets) {
    const lat = pet.latitude!;
    const lng = pet.longitude!;
    const city = await reverseGeocode(lat, lng);
    if (city) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: { city },
      });
      console.log(`  ${pet.name} (${pet.id}) → ${city}`);
      ok++;
    } else {
      console.log(`  ${pet.name} (${pet.id}) → (Nominatim não retornou cidade)`);
      fail++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`Concluído: ${ok} atualizados, ${fail} sem cidade.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
