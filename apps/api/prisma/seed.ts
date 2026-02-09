import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SEED_PASSWORD = 'admin123';

const PETS = [
  {
    name: 'Rex',
    species: 'dog',
    age: 2,
    sex: 'male',
    size: 'large',
    vaccinated: true,
    neutered: true,
    description: 'Cão dócil e brincalhão. Adora crianças e outros pets.',
    latitude: -23.55,
    longitude: -46.63,
    photos: ['https://placedog.net/400/400?id=1'],
  },
  {
    name: 'Luna',
    species: 'cat',
    age: 1,
    sex: 'female',
    size: 'small',
    vaccinated: true,
    neutered: true,
    description: 'Gata carinhosa, ideal para apartamento.',
    latitude: -23.55,
    longitude: -46.64,
    photos: ['https://placekitten.com/400/400'],
  },
  {
    name: 'Thor',
    species: 'dog',
    age: 4,
    sex: 'male',
    size: 'medium',
    vaccinated: true,
    neutered: true,
    description: 'Cão adulto calmo, ótimo companheiro para caminhadas.',
    latitude: -23.56,
    longitude: -46.63,
    photos: ['https://placedog.net/400/400?id=3'],
  },
  {
    name: 'Mia',
    species: 'cat',
    age: 3,
    sex: 'female',
    size: 'medium',
    vaccinated: true,
    neutered: false,
    description: 'Gata independente mas afetuosa. Adora janelas ensolaradas.',
    latitude: -23.54,
    longitude: -46.65,
    photos: ['https://placekitten.com/401/401'],
  },
  {
    name: 'Bob',
    species: 'dog',
    age: 1,
    sex: 'male',
    size: 'small',
    vaccinated: true,
    neutered: true,
    description: 'Filhote cheio de energia. Precisa de espaço para correr.',
    latitude: -23.55,
    longitude: -46.62,
    photos: ['https://placedog.net/400/400?id=5'],
  },
  {
    name: 'Nina',
    species: 'cat',
    age: 2,
    sex: 'female',
    size: 'small',
    vaccinated: true,
    neutered: true,
    description: 'Gata tranquila, perfeita para quem busca um pet calmo.',
    latitude: -23.57,
    longitude: -46.63,
    photos: ['https://placekitten.com/402/402'],
  },
  {
    name: 'Max',
    species: 'dog',
    age: 5,
    sex: 'male',
    size: 'xlarge',
    vaccinated: true,
    neutered: true,
    description: 'Cão grande e gentil. Experiência com família recomendada.',
    latitude: -23.54,
    longitude: -46.64,
    photos: ['https://placedog.net/400/400?id=7'],
  },
  {
    name: 'Bela',
    species: 'dog',
    age: 2,
    sex: 'female',
    size: 'medium',
    vaccinated: true,
    neutered: true,
    description: 'Cadela amorosa, adora brincar e receber carinho.',
    latitude: -23.55,
    longitude: -46.65,
    photos: ['https://placedog.net/400/400?id=8'],
  },
  {
    name: 'Felix',
    species: 'cat',
    age: 4,
    sex: 'male',
    size: 'medium',
    vaccinated: true,
    neutered: true,
    description: 'Gato sociável, se dá bem com outros animais.',
    latitude: -23.56,
    longitude: -46.62,
    photos: ['https://placekitten.com/403/403'],
  },
  {
    name: 'Mel',
    species: 'dog',
    age: 3,
    sex: 'female',
    size: 'small',
    vaccinated: true,
    neutered: true,
    description: 'Pequena e encantadora. Ideal para apartamentos.',
    latitude: -23.53,
    longitude: -46.63,
    photos: ['https://placedog.net/400/400?id=10'],
  },
];

/** ID fixo do usuário admin de teste (seed). Use em ADMIN_USER_IDS no .env da API. */
const ADMIN_TESTE_USER_ID = '22222222-2222-2222-2222-222222222222';

async function main() {
  const defaultUserId = '11111111-1111-1111-1111-111111111111';
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const owner = await prisma.user.upsert({
    where: { email: 'admin@adopet.com.br' },
    update: { passwordHash },
    create: {
      id: defaultUserId,
      email: 'admin@adopet.com.br',
      passwordHash,
      name: 'Admin Adopet',
    },
  });

  // Usuário só para testar painel admin: garantir ID fixo para usar em ADMIN_USER_IDS
  const existingAdminTeste = await prisma.user.findUnique({
    where: { email: 'admin-teste@adopet.com.br' },
    select: { id: true },
  });
  if (existingAdminTeste && existingAdminTeste.id !== ADMIN_TESTE_USER_ID) {
    await prisma.userPreferences.deleteMany({ where: { userId: existingAdminTeste.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: existingAdminTeste.id } }).catch(() => {});
  }
  await prisma.user.upsert({
    where: { email: 'admin-teste@adopet.com.br' },
    update: { passwordHash, name: 'Admin Teste' },
    create: {
      id: ADMIN_TESTE_USER_ID,
      email: 'admin-teste@adopet.com.br',
      passwordHash,
      name: 'Admin Teste',
    },
  });
  await prisma.userPreferences.upsert({
    where: { userId: ADMIN_TESTE_USER_ID },
    update: {},
    create: { userId: ADMIN_TESTE_USER_ID, species: 'BOTH', radiusKm: 50 },
  });

  await prisma.userPreferences.upsert({
    where: { userId: owner.id },
    update: {},
    create: { userId: owner.id, species: 'BOTH', radiusKm: 50 },
  });

  let petsForVerification: { id: string; name: string }[] = [];
  const petCount = await prisma.pet.count();

  if (petCount < 10) {
    for (const p of PETS) {
      const pet = await prisma.pet.create({
        data: {
          name: p.name,
          species: p.species,
          age: p.age,
          sex: p.sex,
          size: p.size,
          vaccinated: p.vaccinated,
          neutered: p.neutered,
          description: p.description,
          status: 'AVAILABLE',
          latitude: p.latitude,
          longitude: p.longitude,
          ownerId: owner.id,
          media: {
            create: p.photos.map((url, sortOrder) => ({ url, sortOrder })),
          },
        },
      });
      petsForVerification.push({ id: pet.id, name: pet.name });
      console.log('Created pet:', pet.name);
    }
  } else {
    console.log('Pets already exist. Skipping pet creation.');
    const existing = await prisma.pet.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'asc' },
      take: 4,
      select: { id: true, name: true },
    });
    petsForVerification = existing;
  }

  // Verifications: só cria se ainda não existir nenhuma para este usuário
  const hasVerifications = await prisma.verification.findFirst({
    where: { userId: owner.id },
  });
  if (!hasVerifications && petsForVerification.length >= 4) {
    await prisma.verification.create({
      data: {
        userId: owner.id,
        type: 'USER_VERIFIED',
        status: 'APPROVED',
      },
    });
    console.log('Created verification: USER_VERIFIED APPROVED (perfil verificado)');

    await prisma.verification.create({
      data: {
        userId: owner.id,
        type: 'PET_VERIFIED',
        status: 'APPROVED',
        metadata: { petId: petsForVerification[0].id },
      },
    });
    console.log('Created verification: PET_VERIFIED APPROVED para', petsForVerification[0].name);

    await prisma.verification.create({
      data: {
        userId: owner.id,
        type: 'PET_VERIFIED',
        status: 'APPROVED',
        metadata: { petId: petsForVerification[1].id },
      },
    });
    console.log('Created verification: PET_VERIFIED APPROVED para', petsForVerification[1].name);

    await prisma.verification.create({
      data: {
        userId: owner.id,
        type: 'PET_VERIFIED',
        status: 'PENDING',
        metadata: { petId: petsForVerification[2].id },
      },
    });
    console.log('Created verification: PET_VERIFIED PENDING para', petsForVerification[2].name);

    await prisma.verification.create({
      data: {
        userId: owner.id,
        type: 'PET_VERIFIED',
        status: 'REJECTED',
        metadata: { petId: petsForVerification[3].id },
      },
    });
    console.log('Created verification: PET_VERIFIED REJECTED para', petsForVerification[3].name);
  } else if (hasVerifications) {
    console.log('Verifications already exist for seed user. Skip.');
  }

  console.log('Seed concluído.');
  console.log('  Login admin: admin@adopet.com.br / ' + SEED_PASSWORD);
  console.log('  Login admin (teste): admin-teste@adopet.com.br / ' + SEED_PASSWORD);
  console.log('  Para ver o link Administração, defina no .env da API:');
  console.log('  ADMIN_USER_IDS=' + ADMIN_TESTE_USER_ID);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
