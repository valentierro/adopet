/**
 * Backfill dos campos de triagem do usuário e preferência de tutor do pet,
 * para organizar a base e testar o match score. Preenche de forma aleatória.
 *
 * Uso: pnpm run db:backfill-match-fields
 *
 * - Usuários: preenche todos os campos de triagem (User) quando estiverem vazios:
 *   housingType, hasYard, hasOtherPets, hasChildren, timeAtHome, petsAllowedAtHome,
 *   dogExperience, catExperience, householdAgreesToAdoption, activityLevel,
 *   preferredPetAge, commitsToVetCare, walkFrequency, monthlyBudgetForPet, whyAdopt.
 * - UserPreferences: preenche sizePref e sexPref (e species) para usuários que já têm triagem
 *   mas preferências vazias ou padrão, para variar o match.
 * - Pets: preenche todos os preferredTutor* e hasOngoingCosts quando estiverem vazios.
 */
import { PrismaClient } from '../api/prisma-generated';

const prisma = new PrismaClient();

const HOUSING = ['CASA', 'APARTAMENTO'] as const;
const HOUSING_PET = ['CASA', 'APARTAMENTO', 'INDIFERENTE'] as const;
const TIME_AT_HOME = ['MOST_DAY', 'HALF_DAY', 'LITTLE'] as const;
const TIME_AT_HOME_PET = ['MOST_DAY', 'HALF_DAY', 'LITTLE', 'INDIFERENTE'] as const;
const PETS_ALLOWED = ['YES', 'NO', 'UNSURE'] as const;
const EXPERIENCE = ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'] as const;
const HOUSEHOLD_AGREES = ['YES', 'DISCUSSING'] as const;
const SIM_NAO_INDIFERENTE = ['SIM', 'NAO', 'INDIFERENTE'] as const;
const ACTIVITY_LEVEL = ['LOW', 'MEDIUM', 'HIGH'] as const;
const PREFERRED_PET_AGE = ['PUPPY', 'ADULT', 'SENIOR', 'ANY'] as const;
const COMMITS_TO_VET_CARE = ['YES', 'NO'] as const;
const WALK_FREQUENCY = ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'NOT_APPLICABLE'] as const;
const MONTHLY_BUDGET = ['LOW', 'MEDIUM', 'HIGH'] as const;
const SPECIES_PREF = ['DOG', 'CAT', 'BOTH'] as const;
const SIZE_PREF = ['small', 'medium', 'large', 'xlarge', 'both'] as const;
const SEX_PREF = ['male', 'female', 'both'] as const;
const WALK_FREQ_PET = ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'INDIFERENTE'] as const;

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
        activityLevel: pick(ACTIVITY_LEVEL),
        preferredPetAge: pick(PREFERRED_PET_AGE),
        commitsToVetCare: pick(COMMITS_TO_VET_CARE),
        walkFrequency: pick(WALK_FREQUENCY),
        monthlyBudgetForPet: pick(MONTHLY_BUDGET),
        whyAdopt: Math.random() < 0.7 ? pick(WHY_ADOPT_SAMPLES) : null,
      },
    });
    count++;
  }
  return count;
}

/** Preenche UserPreferences (sizePref, sexPref, species) para usuários que têm triagem mas preferências vazias/padrão. */
async function backfillUserPreferences() {
  const usersWithPrefs = await prisma.user.findMany({
    where: { deactivatedAt: null, preferences: { isNot: null } },
    select: { id: true, preferences: { select: { id: true, sizePref: true, sexPref: true, species: true } } },
  });

  const toUpdate = usersWithPrefs.filter(
    (u) => u.preferences && (u.preferences.sizePref == null || u.preferences.sexPref == null),
  );
  if (toUpdate.length === 0) {
    console.log('  Nenhuma preferência de usuário (porte/sexo) vazia para preencher.');
    return 0;
  }

  console.log(`  Preenchendo preferências (espécie/porte/sexo) de ${toUpdate.length} usuário(s)...`);
  let count = 0;
  for (const u of toUpdate) {
    if (!u.preferences) continue;
    await prisma.userPreferences.update({
      where: { id: u.preferences.id },
      data: {
        species: pick(SPECIES_PREF),
        sizePref: pick(SIZE_PREF),
        sexPref: pick(SEX_PREF),
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
      preferredTutorWalkFrequency: null,
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
        preferredTutorHousingType: maybeNull(pick(HOUSING_PET), 0.15),
        preferredTutorHasYard: maybeNull(pick(SIM_NAO_INDIFERENTE), 0.2),
        preferredTutorHasOtherPets: maybeNull(pick(SIM_NAO_INDIFERENTE), 0.2),
        preferredTutorHasChildren: maybeNull(pick(SIM_NAO_INDIFERENTE), 0.2),
        preferredTutorTimeAtHome: maybeNull(pick(TIME_AT_HOME_PET), 0.15),
        preferredTutorPetsAllowedAtHome: maybeNull(pick(PETS_ALLOWED), 0.2),
        preferredTutorDogExperience: maybeNull(pick(EXPERIENCE), 0.15),
        preferredTutorCatExperience: maybeNull(pick(EXPERIENCE), 0.15),
        preferredTutorHouseholdAgrees: maybeNull(pick(HOUSEHOLD_AGREES), 0.2),
        preferredTutorWalkFrequency: maybeNull(pick(WALK_FREQ_PET), 0.2),
        hasOngoingCosts: maybeNull(Math.random() < 0.3, 0.4),
      },
    });
    count++;
  }
  return count;
}

/** Cria UserPreferences para usuários que têm triagem mas ainda não têm registro de preferências. */
async function ensureUserPreferencesForBackfilledUsers() {
  const usersWithTriagemNoPrefs = await prisma.user.findMany({
    where: {
      deactivatedAt: null,
      housingType: { not: null },
      preferences: null,
    },
    select: { id: true },
  });
  if (usersWithTriagemNoPrefs.length === 0) return 0;
  console.log(`  Criando preferências para ${usersWithTriagemNoPrefs.length} usuário(s) que tinham triagem sem preferências...`);
  let count = 0;
  for (const u of usersWithTriagemNoPrefs) {
    await prisma.userPreferences.create({
      data: {
        userId: u.id,
        species: pick(SPECIES_PREF),
        sizePref: pick(SIZE_PREF),
        sexPref: pick(SEX_PREF),
        radiusKm: 50,
      },
    });
    count++;
  }
  return count;
}

async function main() {
  console.log('Backfill: triagem (usuários), preferências (espécie/porte/sexo) e preferência de tutor (pets)\n');
  console.log('Preenchendo de forma aleatória para testar o match score.\n');

  const usersUpdated = await backfillUsers();
  const prefsCreated = await ensureUserPreferencesForBackfilledUsers();
  const prefsUpdated = await backfillUserPreferences();
  const petsUpdated = await backfillPets();

  console.log('\nResumo:');
  console.log(`  Usuários com triagem preenchida: ${usersUpdated}`);
  console.log(`  Preferências criadas (quem não tinha): ${prefsCreated}`);
  console.log(`  Preferências (espécie/porte/sexo) preenchidas: ${prefsUpdated}`);
  console.log(`  Pets com preferência de tutor preenchida: ${petsUpdated}`);
  console.log('\nPróximo passo: abra o feed no app para ver os badges de match nos cards.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
