/**
 * Preenche latitude/longitude de pets aprovados que têm cidade mas não têm coordenadas,
 * para que apareçam no mapa. Usa forward geocode (Nominatim). Respeita 1 req/s (delay entre chamadas).
 * Uso: pnpm run db:backfill-pet-coordinates
 */
import { PrismaClient } from '../api/prisma-generated';
import { forwardGeocode } from '../src/common/geocoding';

const prisma = new PrismaClient();

const DELAY_MS = 1100;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const pets = await prisma.pet.findMany({
    where: {
      publicationStatus: 'APPROVED',
      status: 'AVAILABLE',
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      name: true,
      city: true,
      latitude: true,
      longitude: true,
      ownerId: true,
      owner: { select: { city: true } },
    },
  });

  const withCity = pets.filter((p) => {
    const city = (p.city ?? p.owner?.city)?.trim();
    return !!city;
  });

  if (withCity.length === 0) {
    console.log('Nenhum pet aprovado sem coordenadas e com cidade encontrado.');
    return;
  }

  console.log(
    `Encontrados ${withCity.length} pet(s) aprovados sem lat/lng e com cidade. Preenchendo coordenadas...`,
  );

  let ok = 0;
  let fail = 0;

  for (const pet of withCity) {
    const city = (pet.city ?? pet.owner?.city)?.trim() ?? '';
    const coords = await forwardGeocode(city);
    if (coords) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      });
      console.log(`  ${pet.name} (${pet.id}) → ${city} → (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      ok++;
    } else {
      console.log(`  ${pet.name} (${pet.id}) → ${city} → (Nominatim sem resultado)`);
      fail++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`Concluído: ${ok} atualizados, ${fail} sem coordenadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
