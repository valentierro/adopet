#!/usr/bin/env ts-node
/**
 * Seed de 10 pets (Pet1..Pet10) para ovalen507@gmail.com.
 * Rode: cd apps/api && pnpm exec ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-ovalen507-pets.ts
 */
import { PrismaClient } from '../api/prisma-generated';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SEED_PASSWORD = 'admin123';

const DOG_BREEDS = ['SRD', 'Golden Retriever', 'Labrador', 'Bulldog', 'Poodle', 'Pastor Alemão', 'Vira-lata', 'Beagle', 'Shih Tzu', 'Yorkshire'];
const CAT_BREEDS = ['SRD', 'Persa', 'Siamês', 'Maine Coon', 'Angorá', 'Vira-lata', 'British Shorthair', 'Ragdoll', 'Bengal', 'Sphynx'];
const SIZES = ['small', 'medium', 'large', 'xlarge'];
const DESCRIPTIONS_DOG = ['Cão dócil e brincalhão. Adora crianças e outros pets.', 'Muito carinhoso, ideal para família.'];
const DESCRIPTIONS_CAT = ['Gata carinhosa, ideal para apartamento.', 'Independente mas afetuosa.'];
const REASONS = ['Mudança de cidade.', 'Procurando um lar amoroso.', null];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
function randomAge(): number {
  return Math.floor(Math.random() * 15) + 1;
}
function randomCoord(base: number, delta: number): number {
  return base + (Math.random() * 2 - 1) * delta;
}
const SEED_NEIGHBORHOODS = [
  { lat: -8.11, lng: -35.01 },
  { lat: -8.054, lng: -34.881 },
];
function pickNeighborhood(): { lat: number; lng: number } {
  const n = SEED_NEIGHBORHOODS[Math.floor(Math.random() * SEED_NEIGHBORHOODS.length)]!;
  return { lat: randomCoord(n.lat, 0.005), lng: randomCoord(n.lng, 0.005) };
}
function seedPhotoUrl(folder: 'dogs' | 'cats', index: number): string {
  const seed = folder === 'dogs' ? `dogs-${index}` : `cats-${index}`;
  return `https://picsum.photos/seed/${seed}/400/400`;
}

async function main() {
  let user = await prisma.user.findUnique({
    where: { email: 'ovalen507@gmail.com' },
    select: { id: true, name: true },
  });
  if (!user) {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: 'ovalen507@gmail.com',
        passwordHash,
        name: 'Ovalen507',
      },
      select: { id: true, name: true },
    });
    await prisma.userPreferences.create({
      data: { userId: user.id, species: 'BOTH', radiusKm: 50 },
    });
    console.log('Usuário ovalen507@gmail.com criado. Senha: ' + SEED_PASSWORD);
  }

  const names = ['Pet1', 'Pet2', 'Pet3', 'Pet4', 'Pet5', 'Pet6', 'Pet7', 'Pet8', 'Pet9', 'Pet10'];
  let created = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    const exists = await prisma.pet.findFirst({
      where: { ownerId: user.id, name },
      select: { id: true },
    });
    if (exists) {
      console.log(`  ${name} já existe, pulando.`);
      continue;
    }
    const isDog = i % 2 === 0;
    const { lat, lng } = pickNeighborhood();
    await prisma.pet.create({
      data: {
        name,
        species: isDog ? 'DOG' : 'CAT',
        breed: isDog ? pick(DOG_BREEDS) : pick(CAT_BREEDS),
        age: randomAge(),
        sex: Math.random() < 0.5 ? 'male' : 'female',
        size: pick(SIZES),
        vaccinated: Math.random() < 0.8,
        neutered: Math.random() < 0.7,
        description: isDog ? pick(DESCRIPTIONS_DOG) : pick(DESCRIPTIONS_CAT),
        adoptionReason: pick(REASONS) ?? undefined,
        status: 'AVAILABLE',
        publicationStatus: 'APPROVED',
        latitude: lat,
        longitude: lng,
        ownerId: user.id,
        media: {
          create: [
            { url: seedPhotoUrl(isDog ? 'dogs' : 'cats', 300 + i), sortOrder: 0, isPrimary: true },
          ],
        },
      },
    });
    created++;
    console.log(`  Criado: ${name} (${isDog ? 'cachorro' : 'gato'})`);
  }
  console.log(`\nPronto. ${created} pet(s) criado(s) para ovalen507@gmail.com (Pet1..Pet10).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
