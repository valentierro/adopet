/**
 * Backfill dos campos de triagem do usuário e preferência de tutor do pet,
 * para registros criados antes desses campos existirem. Gera massa aderente para testes manuais.
 *
 * Uso: pnpm run db:backfill-match-fields
 *
 * - Usuários: preenche housingType, hasYard, hasOtherPets, hasChildren, timeAtHome,
 *   petsAllowedAtHome, dogExperience, catExperience, householdAgreesToAdoption (e opcionalmente whyAdopt)
 *   quando todos estiverem vazios.
 * - Pets: preenche preferredTutor* quando todos estiverem vazios.
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

const HOUSING = ['CASA', 'APARTAMENTO'] as const;
const TIME_AT_HOME = ['MOST_DAY', 'HALF_DAY', 'LITTLE'] as const;
const PETS_ALLOWED = ['YES', 'NO', 'UNSURE'] as const;
const EXPERIENCE = ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'] as const;
const HOUSEHOLD_AGREES = ['YES', 'DISCUSSING'] as const;

const WHY_ADOPT_SAMPLES = [
  'Quero dar um lar amoroso para um animal.',
  'Tenho espaço e tempo para cuidar de um pet.',
  'Minha família quer adotar um novo membro.',
  'Perdi meu pet recentemente e quero adotar de novo.',
  'Sempre quis ter um cachorro/gato.',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function maybeNull<T>(value: T, chanceNull = 0.1): T | null {
  return Math.random() < chanceNull ? null : value;
}

async function backfillUsers() {
  const users = await prisma.user.findMany({
    where: {
      deactivatedAt: null,
      housingType: null,
      hasYard: null,
      hasOtherPets: null,
      hasChildren: null,
      timeAtHome: null,
      petsAllowedAtHome: null,
      dogExperience: null,
      catExperience: null,
      householdAgreesToAdoption: null,
    },
    select: { id: true, name: true },
  });

  if (users.length === 0) {
    console.log('  Nenhum usuário sem triagem encontrado.');
    return 0;
  }

  console.log(`  Preenchendo triagem de ${users.length} usuário(s)...`);
  let count = 0;
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        housingType: pick(HOUSING),
        hasYard: Math.random() < 0.6,
        hasOtherPets: Math.random() < 0.4,
        hasChildren: Math.random() < 0.35,
        timeAtHome: pick(TIME_AT_HOME),
        petsAllowedAtHome: pick(PETS_ALLOWED),
        dogExperience: pick(EXPERIENCE),
        catExperience: pick(EXPERIENCE),
        householdAgreesToAdoption: pick(HOUSEHOLD_AGREES),
        whyAdopt: Math.random() < 0.7 ? pick(WHY_ADOPT_SAMPLES) : null,
      },
    });
    count++;
  }
  return count;
}

async function backfillPets() {
  const pets = await prisma.pet.findMany({
    where: {
      preferredTutorHousingType: null,
      preferredTutorHasYard: null,
      preferredTutorHasOtherPets: null,
      preferredTutorHasChildren: null,
      preferredTutorTimeAtHome: null,
      preferredTutorPetsAllowedAtHome: null,
      preferredTutorDogExperience: null,
      preferredTutorCatExperience: null,
      preferredTutorHouseholdAgrees: null,
    },
    select: { id: true, name: true, species: true },
  });

  if (pets.length === 0) {
    console.log('  Nenhum pet sem preferência de tutor encontrado.');
    return 0;
  }

  console.log(`  Preenchendo preferência de tutor de ${pets.length} pet(s)...`);
  let count = 0;
  for (const p of pets) {
    await prisma.pet.update({
      where: { id: p.id },
      data: {
        preferredTutorHousingType: maybeNull(pick(HOUSING), 0.15),
        preferredTutorHasYard: maybeNull(Math.random() < 0.5, 0.2),
        preferredTutorHasOtherPets: maybeNull(Math.random() < 0.5, 0.2),
        preferredTutorHasChildren: maybeNull(Math.random() < 0.5, 0.2),
        preferredTutorTimeAtHome: maybeNull(pick(TIME_AT_HOME), 0.15),
        preferredTutorPetsAllowedAtHome: maybeNull(pick(PETS_ALLOWED), 0.2),
        preferredTutorDogExperience: maybeNull(pick(EXPERIENCE), 0.15),
        preferredTutorCatExperience: maybeNull(pick(EXPERIENCE), 0.15),
        preferredTutorHouseholdAgrees: maybeNull(pick(HOUSEHOLD_AGREES), 0.2),
      },
    });
    count++;
  }
  return count;
}

async function main() {
  console.log('Backfill: campos de triagem (usuários) e preferência de tutor (pets)\n');

  const usersUpdated = await backfillUsers();
  const petsUpdated = await backfillPets();

  console.log('\nResumo:');
  console.log(`  Usuários com triagem preenchida: ${usersUpdated}`);
  console.log(`  Pets com preferência de tutor preenchida: ${petsUpdated}`);
  console.log('\nPróximo passo: abra o feed no app para ver os badges de match nos cards.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
