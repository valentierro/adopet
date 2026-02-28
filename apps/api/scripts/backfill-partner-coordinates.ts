/**
 * Preenche latitude/longitude de parceiros que têm cidade mas não têm coordenadas.
 * Usa geocoding (Nominatim) para obter as coordenadas da cidade.
 * Execute: cd apps/api && npx ts-node -r tsconfig-paths/register scripts/backfill-partner-coordinates.ts
 */
import { PrismaClient } from '../api/prisma-generated';
import { forwardGeocode } from '../src/common/geocoding';

const prisma = new PrismaClient();

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      city: { not: null },
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: { id: true, name: true, city: true },
  });
  console.log(`Encontrados ${partners.length} parceiro(s) com cidade mas sem coordenadas.`);
  let updated = 0;
  for (const p of partners) {
    const city = p.city?.trim();
    if (!city) continue;
    const coords = await forwardGeocode(city);
    if (coords) {
      await prisma.partner.update({
        where: { id: p.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      });
      updated += 1;
      console.log(`  ${p.name} (${city}): ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`  ${p.name} (${city}): geocoding falhou`);
    }
    await new Promise((r) => setTimeout(r, 1100));
  }
  console.log(`Pronto. ${updated} parceiro(s) atualizado(s) com coordenadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
