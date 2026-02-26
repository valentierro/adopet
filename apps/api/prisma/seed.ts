import { PrismaClient } from '../api/prisma-generated';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SEED_PASSWORD = 'admin123';

// Dados aleatórios para pets por usuário (10 cachorros + 10 gatos cada)
const DOG_NAMES = ['Rex', 'Thor', 'Max', 'Bob', 'Luke', 'Bobby', 'Toby', 'Zeca', 'Duque', 'Nero', 'Bilu', 'Spike', 'Jack', 'Bolt', 'Simba', 'Lucky', 'Rocky', 'Bento', 'Nino', 'Zorro'];
const CAT_NAMES = ['Luna', 'Mia', 'Nina', 'Felix', 'Luna', 'Mel', 'Mimi', 'Lola', 'Mocha', 'Pipoca', 'Frida', 'Cleo', 'Lua', 'Bela', 'Kiara', 'Maya', 'Lily', 'Nala', 'Bastet', 'Chica'];
const DOG_BREEDS = ['SRD', 'Golden Retriever', 'Labrador', 'Bulldog', 'Poodle', 'Pastor Alemão', 'Vira-lata', 'Beagle', 'Shih Tzu', 'Yorkshire'];
const CAT_BREEDS = ['SRD', 'Persa', 'Siamês', 'Maine Coon', 'Angorá', 'Vira-lata', 'British Shorthair', 'Ragdoll', 'Bengal', 'Sphynx'];
const SIZES = ['small', 'medium', 'large', 'xlarge'];
const DESCRIPTIONS_DOG = [
  'Cão dócil e brincalhão. Adora crianças e outros pets.',
  'Muito carinhoso, ideal para família. Gosta de passeios.',
  'Calmo e companheiro. Perfeito para apartamento.',
  'Cheio de energia, adora correr e brincar.',
  'Protetor e leal. Ótimo com crianças.',
  'Sociável e alegre. Aprende comandos com facilidade.',
  'Tranquilo em casa. Gosta de carinho e sonecas.',
  'Ativo e divertido. Ideal para quem gosta de exercício.',
  'Carinhoso e paciente. Ótimo primeiro pet.',
  'Fiel e brincalhão. Adora brinquedos.',
];
const DESCRIPTIONS_CAT = [
  'Gata carinhosa, ideal para apartamento.',
  'Independente mas afetuosa. Adora janelas ensolaradas.',
  'Tranquila, perfeita para quem busca um pet calmo.',
  'Sociável, se dá bem com outros animais.',
  'Curiosa e brincalhona. Adora arranhadores.',
  'Dócil e companheira. Gosta de colo.',
  'Calma e limpa. Ideal para ambientes pequenos.',
  'Carinhosa nos seus termos. Muito elegante.',
  'Brincalhona quando quer. Adora sonecas.',
  'Apegada ao tutor. Segue pela casa.',
];
const REASONS = [
  'Mudança de cidade e não posso levar.',
  'Alergia na família.',
  'Nascimento de bebê.',
  'Muitos pets em casa.',
  'Falta de tempo para dar atenção.',
  'Procurando um lar amoroso.',
  null,
  null,
  null,
  null,
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomAge(): number {
  return Math.floor(Math.random() * 15) + 1;
}

function randomCoord(base: number, delta: number): number {
  return base + (Math.random() * 2 - 1) * delta;
}

/** Bairros/cidades em PE (pequena variação ~0.005° para não sobrepor). */
const SEED_NEIGHBORHOODS: { name: string; lat: number; lng: number }[] = [
  { name: 'Piedade, Jaboatão dos Guararapes', lat: -8.11, lng: -35.01 },
  { name: 'Candeias, Jaboatão dos Guararapes', lat: -8.12, lng: -35.02 },
  { name: 'Boa Viagem, Recife', lat: -8.054, lng: -34.881 },
  { name: 'Ibura, Recife', lat: -8.126, lng: -34.923 },
  { name: 'Marcos Freire, Jaboatão dos Guararapes', lat: -8.13, lng: -35.0 },
  { name: 'Barra de Jangada, Jaboatão dos Guararapes', lat: -8.1, lng: -35.02 },
  { name: 'Gravatá, PE', lat: -8.201, lng: -35.565 },
  { name: 'Pombos, PE', lat: -8.001, lng: -35.213 },
  { name: 'Caruaru, PE', lat: -8.283, lng: -35.976 },
];
const NEIGHBORHOOD_DELTA = 0.005; // ~500 m de variação dentro do bairro

/** Cidades de PE para seed extra de pets (várias cidades, até 40 pets). */
const CIDADES_PE: { city: string; lat: number; lng: number }[] = [
  { city: 'Recife', lat: -8.0476, lng: -34.877 },
  { city: 'Olinda', lat: -8.0089, lng: -34.8553 },
  { city: 'Jaboatão dos Guararapes', lat: -8.1128, lng: -35.0147 },
  { city: 'Caruaru', lat: -8.2845, lng: -35.9699 },
  { city: 'Petrolina', lat: -9.3986, lng: -40.5008 },
  { city: 'Garanhuns', lat: -8.8822, lng: -36.4962 },
  { city: 'Vitória de Santo Antão', lat: -8.1238, lng: -35.2914 },
  { city: 'Cabo de Santo Agostinho', lat: -8.2833, lng: -35.0353 },
  { city: 'Paulista', lat: -7.9408, lng: -34.8731 },
  { city: 'Abreu e Lima', lat: -7.9117, lng: -34.9033 },
  { city: 'Igarassu', lat: -7.8342, lng: -34.9064 },
  { city: 'Serra Talhada', lat: -7.9912, lng: -38.2983 },
  { city: 'Arcoverde', lat: -8.4189, lng: -37.0531 },
  { city: 'Palmares', lat: -8.6833, lng: -35.5917 },
  { city: 'Santa Cruz do Capibaribe', lat: -7.9578, lng: -36.2047 },
  { city: 'Salgueiro', lat: -8.0742, lng: -39.1192 },
  { city: 'Goiana', lat: -7.5606, lng: -35.0022 },
  { city: 'Camaragibe', lat: -8.0214, lng: -35.0144 },
  { city: 'São Lourenço da Mata', lat: -8.0022, lng: -35.0183 },
  { city: 'Belo Jardim', lat: -8.3356, lng: -36.4242 },
];
const CIDADE_DELTA = 0.02; // ~2 km de variação na cidade

function pickNeighborhood(): { lat: number; lng: number } {
  const n = SEED_NEIGHBORHOODS[Math.floor(Math.random() * SEED_NEIGHBORHOODS.length)];
  return {
    lat: randomCoord(n.lat, NEIGHBORHOOD_DELTA),
    lng: randomCoord(n.lng, NEIGHBORHOOD_DELTA),
  };
}

function pickCidadePE(): { lat: number; lng: number } {
  const c = CIDADES_PE[Math.floor(Math.random() * CIDADES_PE.length)];
  return {
    lat: randomCoord(c.lat, CIDADE_DELTA),
    lng: randomCoord(c.lng, CIDADE_DELTA),
  };
}

// Placeholder de fotos que realmente carregam (placedog/placekitten costumam quebrar)
const PICSUM_SIZE = 400;
function seedPhotoUrl(folder: 'dogs' | 'cats', index: number): string {
  const seed = folder === 'dogs' ? `dogs-${index}` : `cats-${index}`;
  return `https://picsum.photos/seed/${seed}/${PICSUM_SIZE}/${PICSUM_SIZE}`;
}

/** URL de foto placeholder por espécie para anúncios sem foto (picsum.photos carrega de forma confiável). */
function placeholderPhotoForSpecies(species: string, petId: string): string {
  const safe = String(petId).replace(/[^a-zA-Z0-9-]/g, '');
  const seed = (species === 'DOG' ? 'dog-' : 'cat-') + (safe || 'pet');
  return `https://picsum.photos/seed/${seed}/${PICSUM_SIZE}/${PICSUM_SIZE}`;
}

/** URL de logo placeholder para parceiros (picsum.photos por slug para consistência). */
function seedPartnerLogoUrl(slug: string): string {
  const safe = String(slug).replace(/[^a-zA-Z0-9-]/g, '');
  return `https://picsum.photos/seed/partner-${safe || 'logo'}/200/200`;
}

/** Atribui logo placeholder a todos os parceiros sem logoUrl. */
async function assignPlaceholderLogosToPartners() {
  const partnersWithoutLogo = await prisma.partner.findMany({
    where: { OR: [{ logoUrl: null }, { logoUrl: '' }] },
    select: { id: true, name: true, slug: true },
  });
  if (partnersWithoutLogo.length === 0) return;
  console.log(`Atribuindo logos a ${partnersWithoutLogo.length} parceiro(s) sem logo...`);
  for (const p of partnersWithoutLogo) {
    const logoUrl = seedPartnerLogoUrl(p.slug);
    await prisma.partner.update({ where: { id: p.id }, data: { logoUrl } });
    console.log(`  ${p.name} → logo adicionada`);
  }
  console.log(`Pronto. ${partnersWithoutLogo.length} parceiro(s) com logo.`);
}

/** Atribui uma foto placeholder (cachorro/gato conforme espécie) a todos os pets sem nenhuma mídia. */
async function assignPlaceholderPhotosToPetsWithoutMedia() {
  const petsWithoutPhoto = await prisma.pet.findMany({
    where: { media: { none: {} } },
    select: { id: true, name: true, species: true },
  });
  if (petsWithoutPhoto.length === 0) return;
  console.log(`Atribuindo fotos a ${petsWithoutPhoto.length} pet(s) sem foto (cachorro/gato conforme espécie)...`);
  for (const pet of petsWithoutPhoto) {
    const url = placeholderPhotoForSpecies(pet.species, pet.id);
    await prisma.petMedia.create({
      data: {
        petId: pet.id,
        url,
        sortOrder: 0,
        isPrimary: true,
      },
    });
    console.log(`  ${pet.name} (${pet.species}) → foto adicionada`);
  }
  console.log(`Pronto. ${petsWithoutPhoto.length} pet(s) com foto.`);
}

const SEED_DOGS_PER_USER = 1;
const SEED_CATS_PER_USER = 1;

/** Probabilidade de vincular um pet do seed a um parceiro ONG (para exibir badge no feed). */
const SEED_PET_PARTNER_CHANCE = 0.3;

async function seedPetsForExistingUsers() {
  const users = await prisma.user.findMany({
    where: { deactivatedAt: null },
    select: { id: true, name: true },
  });
  if (users.length === 0) {
    console.log('Nenhum usuário na base. Pulando seed de pets por usuário.');
    return;
  }
  const partnerIds = await prisma.partner
    .findMany({
      where: { type: 'ONG', active: true, approvedAt: { not: null } },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));
  const pickPartnerId = () =>
    partnerIds.length > 0 && Math.random() < SEED_PET_PARTNER_CHANCE ? pick(partnerIds) : undefined;

  console.log(
    `Encontrados ${users.length} usuário(s). Criando ${SEED_DOGS_PER_USER} cachorros e ${SEED_CATS_PER_USER} gatos para cada (bairros: Recife/Jaboatão)...`,
  );
  for (const user of users) {
    const usedDogNames = new Set<string>();
    const usedCatNames = new Set<string>();
    for (let i = 0; i < SEED_DOGS_PER_USER; i++) {
      let name = pick(DOG_NAMES);
      while (usedDogNames.has(name)) name = pick(DOG_NAMES);
      usedDogNames.add(name);
      const { lat, lng } = pickNeighborhood();
      const partnerId = pickPartnerId();
      await prisma.pet.create({
        data: {
          name: name,
          species: 'DOG',
          breed: pick(DOG_BREEDS),
          age: randomAge(),
          sex: Math.random() < 0.5 ? 'male' : 'female',
          size: pick(SIZES),
          vaccinated: Math.random() < 0.8,
          neutered: Math.random() < 0.7,
          description: pick(DESCRIPTIONS_DOG),
          adoptionReason: pick(REASONS) ?? undefined,
          status: 'AVAILABLE',
          publicationStatus: 'APPROVED',
          latitude: lat,
          longitude: lng,
          ownerId: user.id,
          ...(partnerId ? { partnerId } : {}),
          media: {
            create: [
              { url: seedPhotoUrl('dogs', i), sortOrder: 0, isPrimary: true },
            ],
          },
        },
      });
      console.log(`  [${user.name}] Criado cachorro: ${name}${partnerId ? ' (parceiro)' : ''}`);
    }
    for (let i = 0; i < SEED_CATS_PER_USER; i++) {
      let name = pick(CAT_NAMES);
      while (usedCatNames.has(name)) name = pick(CAT_NAMES);
      usedCatNames.add(name);
      const { lat, lng } = pickNeighborhood();
      const partnerId = pickPartnerId();
      await prisma.pet.create({
        data: {
          name: name,
          species: 'CAT',
          breed: pick(CAT_BREEDS),
          age: randomAge(),
          sex: Math.random() < 0.5 ? 'male' : 'female',
          size: pick(SIZES),
          vaccinated: Math.random() < 0.8,
          neutered: Math.random() < 0.7,
          description: pick(DESCRIPTIONS_CAT),
          adoptionReason: pick(REASONS) ?? undefined,
          status: 'AVAILABLE',
          publicationStatus: 'APPROVED',
          latitude: lat,
          longitude: lng,
          ownerId: user.id,
          ...(partnerId ? { partnerId } : {}),
          media: {
            create: [
              { url: seedPhotoUrl('cats', i), sortOrder: 0, isPrimary: true },
            ],
          },
        },
      });
      console.log(`  [${user.name}] Criado gato: ${name}${partnerId ? ' (parceiro)' : ''}`);
    }
  }
  console.log('Seed de pets por usuário concluído.');
}

/** Bairros em São Francisco (USA) para seed. */
const SAO_FRANCISCO_AREAS: { name: string; lat: number; lng: number }[] = [
  { name: 'Mission District', lat: 37.7599, lng: -122.4194 },
  { name: 'SOMA', lat: 37.7749, lng: -122.4014 },
  { name: 'Castro', lat: 37.7609, lng: -122.4350 },
  { name: 'Hayes Valley', lat: 37.7766, lng: -122.4233 },
  { name: 'Marina', lat: 37.8025, lng: -122.4365 },
  { name: 'North Beach', lat: 37.8001, lng: -122.4102 },
  { name: 'Potrero Hill', lat: 37.7582, lng: -122.4015 },
  { name: 'Bernal Heights', lat: 37.7411, lng: -122.4206 },
  { name: 'Noe Valley', lat: 37.7512, lng: -122.4336 },
  { name: 'Sunset', lat: 37.7544, lng: -122.5090 },
  { name: 'Richmond', lat: 37.7804, lng: -122.4602 },
  { name: 'Dogpatch', lat: 37.7602, lng: -122.3900 },
  { name: 'Glen Park', lat: 37.7331, lng: -122.4345 },
  { name: 'Inner Sunset', lat: 37.7625, lng: -122.4648 },
  { name: 'Pacific Heights', lat: 37.7917, lng: -122.4359 },
];

/** Bairros em São Paulo capital para seed. */
const SAO_PAULO_AREAS: { name: string; lat: number; lng: number }[] = [
  { name: 'Moema', lat: -23.5875, lng: -46.6578 },
  { name: 'Vila Madalena', lat: -23.5489, lng: -46.6889 },
  { name: 'Pinheiros', lat: -23.5619, lng: -46.6992 },
  { name: 'Itaim Bibi', lat: -23.5847, lng: -46.6864 },
  { name: 'Jardins', lat: -23.5633, lng: -46.6639 },
  { name: 'Vila Olímpia', lat: -23.5936, lng: -46.6914 },
  { name: 'Perdizes', lat: -23.5342, lng: -46.6847 },
  { name: 'Santa Cecília', lat: -23.5378, lng: -46.6569 },
  { name: 'Consolação', lat: -23.5506, lng: -46.6592 },
  { name: 'Campo Belo', lat: -23.6011, lng: -46.6764 },
  { name: 'Brooklin', lat: -23.6050, lng: -46.6853 },
  { name: 'Alto de Pinheiros', lat: -23.5569, lng: -46.7153 },
  { name: 'Lapa', lat: -23.5314, lng: -46.7036 },
  { name: 'Vila Mariana', lat: -23.5933, lng: -46.6417 },
  { name: 'Ipiranga', lat: -23.5978, lng: -46.6036 },
];

const REGION_DELTA = 0.008; // ~800 m de variação

function pickSanFrancisco(): { lat: number; lng: number; city: string } {
  const a = SAO_FRANCISCO_AREAS[Math.floor(Math.random() * SAO_FRANCISCO_AREAS.length)];
  return {
    lat: randomCoord(a.lat, REGION_DELTA),
    lng: randomCoord(a.lng, REGION_DELTA),
    city: 'San Francisco, CA',
  };
}

function pickSaoPaulo(): { lat: number; lng: number; city: string } {
  const a = SAO_PAULO_AREAS[Math.floor(Math.random() * SAO_PAULO_AREAS.length)];
  return {
    lat: randomCoord(a.lat, REGION_DELTA),
    lng: randomCoord(a.lng, REGION_DELTA),
    city: 'São Paulo, SP',
  };
}

/** Seed extra: até 40 pets em várias cidades de PE. Usa o usuário admin como dono. */
const SEED_PE_MAX_PETS = 40;

const SEED_SF_PETS = 30;
const SEED_SP_PETS = 30;

/** Cria ~30 pets em São Francisco (USA) e ~30 em São Paulo capital, todos com fotos. */
async function seedPetsSanFranciscoAndSaoPaulo() {
  const hasUsers = await prisma.user.count({ where: { deactivatedAt: null } });
  if (hasUsers === 0) {
    console.log('Nenhum usuário na base. Pulando seed SF/SP.');
    return;
  }

  // Usuários seed para SF e SP (para que o feed exiba a cidade correta via owner.city)
  const sfOwner = await prisma.user.upsert({
    where: { email: 'seed-sf@adopet.com.br' },
    update: { city: 'San Francisco, CA' },
    create: {
      email: 'seed-sf@adopet.com.br',
      passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
      name: 'Seed San Francisco',
      city: 'San Francisco, CA',
    },
  });
  const spOwner = await prisma.user.upsert({
    where: { email: 'seed-sp@adopet.com.br' },
    update: { city: 'São Paulo, SP' },
    create: {
      email: 'seed-sp@adopet.com.br',
      passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
      name: 'Seed São Paulo',
      city: 'São Paulo, SP',
    },
  });
  await prisma.userPreferences.upsert({
    where: { userId: sfOwner.id },
    update: {},
    create: { userId: sfOwner.id, species: 'BOTH', radiusKm: 50 },
  });
  await prisma.userPreferences.upsert({
    where: { userId: spOwner.id },
    update: {},
    create: { userId: spOwner.id, species: 'BOTH', radiusKm: 50 },
  });

  const partnerIds = await prisma.partner
    .findMany({
      where: { type: 'ONG', active: true, approvedAt: { not: null } },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));
  const pickPartnerId = () =>
    partnerIds.length > 0 && Math.random() < SEED_PET_PARTNER_CHANCE ? pick(partnerIds) : undefined;

  // San Francisco: ~37.7, -122.4
  const existingSf = await prisma.pet.count({
    where: {
      ownerId: sfOwner.id,
      latitude: { gte: 37.6, lte: 38 },
      longitude: { gte: -122.6, lte: -122.3 },
    },
  });
  const targetSf = Math.max(0, SEED_SF_PETS - existingSf);
  if (targetSf > 0) {
    console.log(`Criando ${targetSf} pets em San Francisco, CA...`);
    const usedNames = new Set<string>();
    for (let i = 0; i < targetSf; i++) {
      const isDog = Math.random() < 0.55;
      const names = isDog ? DOG_NAMES : CAT_NAMES;
      const breeds = isDog ? DOG_BREEDS : CAT_BREEDS;
      const descriptions = isDog ? DESCRIPTIONS_DOG : DESCRIPTIONS_CAT;
      let name = pick(names);
      let attempts = 0;
      while (usedNames.has(`${name}-${i}`) && attempts++ < 30) name = pick(names);
      usedNames.add(`${name}-${i}`);
      const loc = pickSanFrancisco();
      const partnerId = pickPartnerId();
      await prisma.pet.create({
        data: {
          name,
          species: isDog ? 'DOG' : 'CAT',
          breed: pick(breeds),
          age: randomAge(),
          sex: Math.random() < 0.5 ? 'male' : 'female',
          size: pick(SIZES),
          vaccinated: Math.random() < 0.8,
          neutered: Math.random() < 0.7,
          description: pick(descriptions),
          adoptionReason: pick(REASONS) ?? undefined,
          status: 'AVAILABLE',
          publicationStatus: 'APPROVED',
          latitude: loc.lat,
          longitude: loc.lng,
          ownerId: sfOwner.id,
          ...(partnerId ? { partnerId } : {}),
          media: {
            create: [
              { url: seedPhotoUrl(isDog ? 'dogs' : 'cats', 100 + i), sortOrder: 0, isPrimary: true },
            ],
          },
        },
      });
      console.log(`  [${i + 1}/${targetSf}] ${name} (${isDog ? 'cachorro' : 'gato'}) - SF`);
    }
    console.log(`Seed San Francisco concluído: ${targetSf} pet(s).`);
  }

  // São Paulo capital: ~-23.55, -46.63
  const existingSp = await prisma.pet.count({
    where: {
      ownerId: spOwner.id,
      latitude: { gte: -23.7, lte: -23.4 },
      longitude: { gte: -46.8, lte: -46.5 },
    },
  });
  const targetSp = Math.max(0, SEED_SP_PETS - existingSp);
  if (targetSp > 0) {
    console.log(`Criando ${targetSp} pets em São Paulo, SP...`);
    const usedNames = new Set<string>();
    for (let i = 0; i < targetSp; i++) {
      const isDog = Math.random() < 0.55;
      const names = isDog ? DOG_NAMES : CAT_NAMES;
      const breeds = isDog ? DOG_BREEDS : CAT_BREEDS;
      const descriptions = isDog ? DESCRIPTIONS_DOG : DESCRIPTIONS_CAT;
      let name = pick(names);
      let attempts = 0;
      while (usedNames.has(`${name}-${i}`) && attempts++ < 30) name = pick(names);
      usedNames.add(`${name}-${i}`);
      const loc = pickSaoPaulo();
      const partnerId = pickPartnerId();
      await prisma.pet.create({
        data: {
          name,
          species: isDog ? 'DOG' : 'CAT',
          breed: pick(breeds),
          age: randomAge(),
          sex: Math.random() < 0.5 ? 'male' : 'female',
          size: pick(SIZES),
          vaccinated: Math.random() < 0.8,
          neutered: Math.random() < 0.7,
          description: pick(descriptions),
          adoptionReason: pick(REASONS) ?? undefined,
          status: 'AVAILABLE',
          publicationStatus: 'APPROVED',
          latitude: loc.lat,
          longitude: loc.lng,
          ownerId: spOwner.id,
          ...(partnerId ? { partnerId } : {}),
          media: {
            create: [
              { url: seedPhotoUrl(isDog ? 'dogs' : 'cats', 200 + i), sortOrder: 0, isPrimary: true },
            ],
          },
        },
      });
      console.log(`  [${i + 1}/${targetSp}] ${name} (${isDog ? 'cachorro' : 'gato'}) - SP`);
    }
    console.log(`Seed São Paulo concluído: ${targetSp} pet(s).`);
  }
}

async function seedPetsPernambuco() {
  const owner = await prisma.user.findFirst({
    where: { deactivatedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  if (!owner) {
    console.log('Nenhum usuário na base. Pulando seed de pets PE.');
    return;
  }
  const existingPeCount = await prisma.pet.count({
    where: {
      ownerId: owner.id,
      latitude: { gte: -10, lte: -7 },
      longitude: { gte: -41, lte: -34 },
    },
  });
  const targetNew = Math.max(0, SEED_PE_MAX_PETS - existingPeCount);
  if (targetNew === 0) {
    console.log(`Já existem ${existingPeCount} pets na região PE (máx. ${SEED_PE_MAX_PETS}). Pulando seed PE.`);
    return;
  }
  const existingPets = await prisma.pet.findMany({
    where: { ownerId: owner.id },
    select: { name: true, species: true },
  });
  const existingKeys = new Set(existingPets.map((p) => `${p.name}-${p.species}`));
  const partnerIds = await prisma.partner
    .findMany({
      where: { type: 'ONG', active: true, approvedAt: { not: null } },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));
  const pickPartnerId = () =>
    partnerIds.length > 0 && Math.random() < SEED_PET_PARTNER_CHANCE ? pick(partnerIds) : undefined;

  console.log(`Criando até ${targetNew} pets em cidades de PE (owner: ${owner.name})...`);
  let created = 0;
  const usedNames = new Set<string>();
  for (let i = 0; i < targetNew; i++) {
    const isDog = Math.random() < 0.55;
    const names = isDog ? DOG_NAMES : CAT_NAMES;
    const breeds = isDog ? DOG_BREEDS : CAT_BREEDS;
    const descriptions = isDog ? DESCRIPTIONS_DOG : DESCRIPTIONS_CAT;
    let name = pick(names);
    let key = `${name}-${isDog ? 'DOG' : 'CAT'}`;
    let attempts = 0;
    while (existingKeys.has(key) || usedNames.has(key)) {
      name = pick(names);
      key = `${name}-${isDog ? 'DOG' : 'CAT'}`;
      if (++attempts > 50) break;
    }
    existingKeys.add(key);
    usedNames.add(key);
    const { lat, lng } = pickCidadePE();
    const partnerId = pickPartnerId();
    await prisma.pet.create({
      data: {
        name,
        species: isDog ? 'DOG' : 'CAT',
        breed: pick(breeds),
        age: randomAge(),
        sex: Math.random() < 0.5 ? 'male' : 'female',
        size: pick(SIZES),
        vaccinated: Math.random() < 0.8,
        neutered: Math.random() < 0.7,
        description: pick(descriptions),
        adoptionReason: pick(REASONS) ?? undefined,
        status: 'AVAILABLE',
        publicationStatus: 'APPROVED',
        latitude: lat,
        longitude: lng,
        ownerId: owner.id,
        ...(partnerId ? { partnerId } : {}),
        media: {
          create: [
            { url: seedPhotoUrl(isDog ? 'dogs' : 'cats', i), sortOrder: 0, isPrimary: true },
          ],
        },
      },
    });
    created++;
    console.log(`  [${created}/${targetNew}] ${name} (${isDog ? 'cachorro' : 'gato'})${partnerId ? ' [parceiro]' : ''}`);
  }
  console.log(`Seed PE concluído: ${created} pet(s) criado(s) em cidades de Pernambuco.`);
}

/** Anúncios iniciais do seed (apenas 4 para não encher o feed). Usado para verifications (2 APPROVED, 1 PENDING, 1 REJECTED). */
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
    photos: [seedPhotoUrl('dogs', 1)],
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
    photos: [seedPhotoUrl('cats', 1)],
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
    photos: [seedPhotoUrl('dogs', 3)],
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
    photos: [seedPhotoUrl('cats', 2)],
  },
];

/** ID fixo do usuário admin de teste (seed). Use em ADMIN_USER_IDS no .env da API. */
const ADMIN_TESTE_USER_ID = '22222222-2222-2222-2222-222222222222';

/** Parceiros ONG de exemplo para testar fluxo de parcerias. */
const SEED_PARTNERS_ONG: Array<{
  slug: string;
  name: string;
  city: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  isPaidPartner?: boolean;
}> = [
  {
    slug: 'instituto-amor-de-patas',
    name: 'Instituto Amor de Patas',
    city: 'Recife',
    description:
      'ONG dedicada ao resgate e adoção responsável de cães e gatos na região metropolitana do Recife. Atuamos com castração, vacinação e divulgação de anúncios em parceria com o Adopet.',
    website: 'https://institutoamordepatas.org.br',
    email: 'contato@institutoamordepatas.org.br',
    phone: '(81) 99999-0001',
    isPaidPartner: true,
  },
  {
    slug: 'patinhas-pernambuco',
    name: 'Patinhas Pernambuco',
    city: 'Jaboatão dos Guararapes',
    description:
      'Projeto de proteção animal que promove adoções e eventos de conscientização. Parceiros do Adopet para divulgar pets que precisam de um lar.',
    website: 'https://patinhaspe.org',
    email: 'patinhaspe@email.com',
    phone: '(81) 98888-0002',
  },
  {
    slug: 'lar-temporario-pe',
    name: 'Lar Temporário PE',
    city: 'Caruaru',
    description:
      'Rede de lares temporários e adoção de cães e gatos no agreste pernambucano. Trabalhamos em parceria com o Adopet para ampliar a divulgação dos nossos resgatados.',
    website: 'https://lartemporariope.com.br',
    email: 'contato@lartemporariope.com.br',
    phone: '(81) 97777-0003',
  },
];

/** Parceiros comerciais (clínicas/lojas) para testar lista, detalhe e cupons. */
const SEED_PARTNERS_COMERCIAL: Array<{
  type: 'CLINIC' | 'STORE';
  slug: string;
  name: string;
  city: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  address?: string;
}> = [
  {
    type: 'CLINIC',
    slug: 'clinica-vet-recife',
    name: 'Clínica Veterinária Recife',
    city: 'Recife',
    description: 'Atendimento completo para cães e gatos: consultas, vacinas, cirurgias e banho e tosa. Descontos para usuários Adopet.',
    website: 'https://clinicavetrecife.com.br',
    email: 'contato@clinicavetrecife.com.br',
    phone: '(81) 3333-0001',
    address: 'Av. Boa Viagem, 1000 - Boa Viagem',
  },
  {
    type: 'STORE',
    slug: 'pet-shop-animais-felizes',
    name: 'Pet Shop Animais Felizes',
    city: 'Jaboatão dos Guararapes',
    description: 'Ração, acessórios e medicamentos com o melhor preço. Parceiros Adopet têm condições especiais.',
    website: 'https://animaisfelizes.com.br',
    email: 'vendas@animaisfelizes.com.br',
    phone: '(81) 3333-0002',
    address: 'Rua do Comércio, 500 - Centro',
  },
];

/** Cupons de exemplo por slug do parceiro (comercial + ONG). */
const SEED_COUPONS: Array<{
  partnerSlug: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  validUntilDays?: number;
}> = [
  // Clínica Vet Recife
  { partnerSlug: 'clinica-vet-recife', code: 'ADOPET15', title: '15% na primeira consulta', description: 'Válido para novos clientes', discountType: 'PERCENT', discountValue: 15, validUntilDays: 90 },
  { partnerSlug: 'clinica-vet-recife', code: 'BANHO10', title: '10% em banho e tosa', discountType: 'PERCENT', discountValue: 10, validUntilDays: 60 },
  { partnerSlug: 'clinica-vet-recife', code: 'VACINA20', title: '20% em vacinas', description: 'V8, V10 e antirrábica', discountType: 'PERCENT', discountValue: 20, validUntilDays: 90 },
  { partnerSlug: 'clinica-vet-recife', code: 'CASTRACAO50', title: 'R$ 50 de desconto em castração', description: 'Para pets adotados via Adopet', discountType: 'FIXED', discountValue: 5000, validUntilDays: 180 },
  { partnerSlug: 'clinica-vet-recife', code: 'CHECKUP30', title: '30% em check-up completo', discountType: 'PERCENT', discountValue: 30, validUntilDays: 60 },
  // Pet Shop Animais Felizes
  { partnerSlug: 'pet-shop-animais-felizes', code: 'RACAO20', title: '20% em ração', description: 'Marcas selecionadas', discountType: 'PERCENT', discountValue: 20, validUntilDays: 120 },
  { partnerSlug: 'pet-shop-animais-felizes', code: 'FRETE0', title: 'Frete grátis', description: 'Compras acima de R$ 99', discountType: 'FIXED', discountValue: 0, validUntilDays: 60 },
  { partnerSlug: 'pet-shop-animais-felizes', code: 'PRIMEIRACOMPRA15', title: '15% na primeira compra', description: 'Para novos clientes', discountType: 'PERCENT', discountValue: 15, validUntilDays: 90 },
  { partnerSlug: 'pet-shop-animais-felizes', code: 'BRINQUEDOS25', title: '25% em brinquedos', discountType: 'PERCENT', discountValue: 25, validUntilDays: 45 },
  { partnerSlug: 'pet-shop-animais-felizes', code: 'REMEDIO10', title: '10% em medicamentos', description: 'Vermífugos e antipulgas', discountType: 'PERCENT', discountValue: 10, validUntilDays: 90 },
  // Clínica Vet Amigo (seed)
  { partnerSlug: 'clinica-vet-amigo-seed', code: 'SEED10', title: '10% em qualquer serviço', description: 'Cupom de teste (seed)', discountType: 'PERCENT', discountValue: 10, validUntilDays: 365 },
  { partnerSlug: 'clinica-vet-amigo-seed', code: 'SEED20REAIS', title: 'R$ 20 de desconto', discountType: 'FIXED', discountValue: 2000, validUntilDays: 365 },
  { partnerSlug: 'clinica-vet-amigo-seed', code: 'BANHOTOSA15', title: '15% em banho e tosa', discountType: 'PERCENT', discountValue: 15, validUntilDays: 365 },
  { partnerSlug: 'clinica-vet-amigo-seed', code: 'CONSULTA50', title: 'R$ 50 na consulta', description: 'Consulta de rotina', discountType: 'FIXED', discountValue: 5000, validUntilDays: 365 },
  // ONGs (parceiros podem oferecer descontos em parceiros comerciais ou serviços próprios)
  { partnerSlug: 'instituto-amor-de-patas', code: 'ADOPETONG5', title: '5% em doações', description: 'Apoie nossa ONG', discountType: 'PERCENT', discountValue: 5, validUntilDays: 365 },
  { partnerSlug: 'instituto-amor-de-patas', code: 'CASTRAÇÃO20', title: '20% em castração', description: 'Parceria com clínicas conveniadas', discountType: 'PERCENT', discountValue: 20, validUntilDays: 180 },
  { partnerSlug: 'patinhas-pernambuco', code: 'PATINHAS10', title: '10% em ração', description: 'Para tutores de pets adotados', discountType: 'PERCENT', discountValue: 10, validUntilDays: 120 },
  { partnerSlug: 'patinhas-pernambuco', code: 'BANHOGRATIS', title: 'Banho grátis', description: 'Primeiro banho para pet adotado', discountType: 'FIXED', discountValue: 0, validUntilDays: 365 },
  { partnerSlug: 'lar-temporario-pe', code: 'LAR5', title: '5% em medicamentos', description: 'Parceria com farmácias veterinárias', discountType: 'PERCENT', discountValue: 5, validUntilDays: 90 },
];

/** Serviços prestados por parceiro (slug) para exibir na página do parceiro e marketplace. */
const SEED_SERVICES: Array<{
  partnerSlug: string;
  name: string;
  description?: string;
  priceDisplay?: string;
  validUntilDays?: number;
}> = [
  // Clínica Vet Recife
  { partnerSlug: 'clinica-vet-recife', name: 'Consulta veterinária', description: 'Consulta clínica para cães e gatos', priceDisplay: 'A partir de R$ 80' },
  { partnerSlug: 'clinica-vet-recife', name: 'Banho e tosa', description: 'Banho completo e tosa higiênica', priceDisplay: 'A partir de R$ 50' },
  { partnerSlug: 'clinica-vet-recife', name: 'Vacinação', description: 'Aplicação de vacinas (V8, V10, antirrábica)', priceDisplay: 'Sob consulta' },
  { partnerSlug: 'clinica-vet-recife', name: 'Castração', description: 'Cirurgia de castração para cães e gatos', priceDisplay: 'A partir de R$ 150' },
  { partnerSlug: 'clinica-vet-recife', name: 'Exames laboratoriais', description: 'Hemograma, parasitológico e bioquímicos', priceDisplay: 'Sob consulta' },
  { partnerSlug: 'clinica-vet-recife', name: 'Internação', description: 'Internação com acompanhamento 24h', priceDisplay: 'Diária sob consulta' },
  // Pet Shop Animais Felizes
  { partnerSlug: 'pet-shop-animais-felizes', name: 'Banho', description: 'Banho para cães e gatos', priceDisplay: 'A partir de R$ 35' },
  { partnerSlug: 'pet-shop-animais-felizes', name: 'Hidratação', description: 'Hidratação capilar para pets', priceDisplay: 'R$ 25' },
  { partnerSlug: 'pet-shop-animais-felizes', name: 'Tosa', description: 'Tosa completa ou higiênica', priceDisplay: 'A partir de R$ 45' },
  { partnerSlug: 'pet-shop-animais-felizes', name: 'Cortar unhas', description: 'Manicure pet', priceDisplay: 'R$ 15' },
  { partnerSlug: 'pet-shop-animais-felizes', name: 'Day care', description: 'Hotel para pets durante o dia', priceDisplay: 'R$ 50/dia' },
  // Clínica Vet Amigo (seed)
  { partnerSlug: 'clinica-vet-amigo-seed', name: 'Consulta', description: 'Consulta de rotina (seed)', priceDisplay: 'Sob consulta' },
  { partnerSlug: 'clinica-vet-amigo-seed', name: 'Banho e tosa', description: 'Banho + tosa (seed)', priceDisplay: 'A partir de R$ 45', validUntilDays: 365 },
  { partnerSlug: 'clinica-vet-amigo-seed', name: 'Vacinação', description: 'Aplicação de vacinas', priceDisplay: 'Sob consulta', validUntilDays: 365 },
  { partnerSlug: 'clinica-vet-amigo-seed', name: 'Castração', description: 'Cirurgia de castração', priceDisplay: 'A partir de R$ 120', validUntilDays: 365 },
  // ONGs (serviços sociais ou parcerias)
  { partnerSlug: 'instituto-amor-de-patas', name: 'Orientação para adoção', description: 'Conversa com nossa equipe sobre adoção responsável', priceDisplay: 'Gratuito' },
  { partnerSlug: 'instituto-amor-de-patas', name: 'Castração social', description: 'Castração com preço popular para baixa renda', priceDisplay: 'Sob análise' },
  { partnerSlug: 'patinhas-pernambuco', name: 'Banho beneficente', description: 'Banho a preço social, renda para a ONG', priceDisplay: 'R$ 20' },
  { partnerSlug: 'patinhas-pernambuco', name: 'Evento de adoção', description: 'Visite nossos eventos presenciais', priceDisplay: 'Gratuito' },
  { partnerSlug: 'lar-temporario-pe', name: 'Visita ao lar temporário', description: 'Agende visita para conhecer nossos pets', priceDisplay: 'Gratuito' },
];

async function seedPartners() {
  const existing = await prisma.partner.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((p) => p.slug));

  for (const p of SEED_PARTNERS_ONG) {
    if (existingSlugs.has(p.slug)) {
      console.log('Parceiro ONG já existe:', p.slug);
      continue;
    }
    await prisma.partner.create({
      data: {
        type: 'ONG',
        name: p.name,
        slug: p.slug,
        city: p.city,
        description: p.description,
        website: p.website,
        email: p.email,
        phone: p.phone,
        active: true,
        approvedAt: new Date(),
        isPaidPartner: p.isPaidPartner ?? false,
      },
    });
    console.log('Parceiro criado (ONG):', p.name, p.isPaidPartner ? '(destaque)' : '');
    existingSlugs.add(p.slug);
  }

  for (const p of SEED_PARTNERS_COMERCIAL) {
    if (existingSlugs.has(p.slug)) {
      console.log('Parceiro comercial já existe:', p.slug);
      continue;
    }
    try {
      await prisma.partner.create({
        data: {
          type: p.type,
          name: p.name,
          slug: p.slug,
          city: p.city,
          description: p.description,
          website: p.website,
          email: p.email,
          phone: p.phone,
          active: true,
          approvedAt: new Date(),
          isPaidPartner: true,
        },
      });
      console.log('Parceiro criado (comercial):', p.name);
      existingSlugs.add(p.slug);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code === 'P2022' || (typeof err?.message === 'string' && err.message.includes('does not exist'))) {
        console.warn('Parceiros comerciais ignorados: banco sem colunas recentes (userId, etc.). Rode: pnpm exec prisma migrate dev');
        break;
      }
      throw e;
    }
  }
}

async function seedPartnerCoupons() {
  for (const c of SEED_COUPONS) {
    const partner = await prisma.partner.findUnique({ where: { slug: c.partnerSlug } });
    if (!partner) {
      console.log('Cupom ignorado (parceiro não encontrado):', c.partnerSlug, c.code);
      continue;
    }
    const existing = await prisma.partnerCoupon.findFirst({
      where: { partnerId: partner.id, code: c.code },
    });
    if (existing) {
      console.log('Cupom já existe:', c.code, 'em', c.partnerSlug);
      continue;
    }
    const validUntil = c.validUntilDays
      ? new Date(Date.now() + c.validUntilDays * 24 * 60 * 60 * 1000)
      : null;
    await prisma.partnerCoupon.create({
      data: {
        partnerId: partner.id,
        code: c.code,
        title: c.title,
        description: c.description ?? null,
        discountType: c.discountType,
        discountValue: c.discountValue,
        validUntil,
        active: true,
      },
    });
    console.log('Cupom criado:', c.code, 'para', c.partnerSlug);
  }
}

async function seedPartnerServices() {
  for (const s of SEED_SERVICES) {
    const partner = await prisma.partner.findUnique({ where: { slug: s.partnerSlug } });
    if (!partner) {
      console.log('Serviço ignorado (parceiro não encontrado):', s.partnerSlug, s.name);
      continue;
    }
    const existing = await prisma.partnerService.findFirst({
      where: { partnerId: partner.id, name: s.name },
    });
    if (existing) {
      console.log('Serviço já existe:', s.name, 'em', s.partnerSlug);
      continue;
    }
    const validUntil = s.validUntilDays
      ? new Date(Date.now() + s.validUntilDays * 24 * 60 * 60 * 1000)
      : null;
    await prisma.partnerService.create({
      data: {
        partnerId: partner.id,
        name: s.name,
        description: s.description ?? null,
        priceDisplay: s.priceDisplay ?? null,
        validUntil,
        active: true,
      },
    });
    console.log('Serviço criado:', s.name, 'para', s.partnerSlug);
  }
}

/** Valores válidos para preferências de tutor do pet (match score). */
const PET_PREF_HOUSING = ['CASA', 'APARTAMENTO', 'INDIFERENTE'] as const;
const PET_PREF_SIM_NAO = ['SIM', 'NAO', 'INDIFERENTE'] as const;
const PET_PREF_TIME = ['MOST_DAY', 'HALF_DAY', 'LITTLE', 'INDIFERENTE'] as const;
const PET_PREF_PETS_ALLOWED = ['YES', 'NO', 'UNSURE'] as const;
const PET_PREF_EXPERIENCE = ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'] as const;
const PET_PREF_HOUSEHOLD = ['YES', 'DISCUSSING'] as const;
const PET_PREF_WALK = ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'INDIFERENTE'] as const;
const PET_ENERGY = ['LOW', 'MEDIUM', 'HIGH'] as const;
const PET_GOOD_WITH = ['YES', 'NO', 'UNKNOWN'] as const;
const PET_TEMPERAMENT = ['CALM', 'PLAYFUL', 'SHY', 'SOCIABLE', 'INDEPENDENT'] as const;

/** Preenche preferências de tutor nos pets aleatoriamente (para testar match score). ~70% dos pets recebem preferências. */
async function seedPetPreferencesForMatch() {
  const pets = await prisma.pet.findMany({
    where: { publicationStatus: 'APPROVED', status: 'AVAILABLE' },
    select: { id: true, name: true, species: true },
  });
  if (pets.length === 0) return;
  let updated = 0;
  for (const pet of pets) {
    if (Math.random() > 0.7) continue; // 70% recebem preferências
    const data: Record<string, unknown> = {};
    if (Math.random() < 0.6) data.preferredTutorHousingType = pick(PET_PREF_HOUSING);
    if (Math.random() < 0.5) data.preferredTutorHasYard = pick(PET_PREF_SIM_NAO);
    if (Math.random() < 0.5) data.preferredTutorHasOtherPets = pick(PET_PREF_SIM_NAO);
    if (Math.random() < 0.5) data.preferredTutorHasChildren = pick(PET_PREF_SIM_NAO);
    if (Math.random() < 0.5) data.preferredTutorTimeAtHome = pick(PET_PREF_TIME);
    if (Math.random() < 0.4) data.preferredTutorPetsAllowedAtHome = pick(PET_PREF_PETS_ALLOWED);
    if (Math.random() < 0.5) data.preferredTutorDogExperience = pick(PET_PREF_EXPERIENCE);
    if (Math.random() < 0.5) data.preferredTutorCatExperience = pick(PET_PREF_EXPERIENCE);
    if (Math.random() < 0.5) data.preferredTutorHouseholdAgrees = pick(PET_PREF_HOUSEHOLD);
    if (Math.random() < 0.5) data.preferredTutorWalkFrequency = pick(PET_PREF_WALK);
    if (Math.random() < 0.3) data.hasOngoingCosts = Math.random() < 0.5;
    if (Math.random() < 0.6) data.energyLevel = pick(PET_ENERGY);
    if (pet.species === 'DOG' && Math.random() < 0.4) data.goodWithDogs = pick(PET_GOOD_WITH);
    if (Math.random() < 0.4) data.goodWithCats = pick(PET_GOOD_WITH);
    if (Math.random() < 0.5) data.goodWithChildren = pick(PET_GOOD_WITH);
    if (Math.random() < 0.5) data.temperament = pick(PET_TEMPERAMENT);
    if (Object.keys(data).length === 0) continue;
    await prisma.pet.update({ where: { id: pet.id }, data: data as object });
    updated++;
  }
  console.log(`Preferências de tutor preenchidas em ${updated} pet(s) para testar match score.`);
}

/** Valores válidos para perfil de usuário (match score). */
const USER_HOUSING = ['CASA', 'APARTAMENTO'] as const;
const USER_TIME = ['MOST_DAY', 'HALF_DAY', 'LITTLE'] as const;
const USER_PETS_ALLOWED = ['YES', 'NO', 'UNSURE'] as const;
const USER_EXPERIENCE = ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'] as const;
const USER_HOUSEHOLD = ['YES', 'DISCUSSING'] as const;
const USER_ACTIVITY = ['LOW', 'MEDIUM', 'HIGH'] as const;
const USER_PET_AGE = ['PUPPY', 'ADULT', 'SENIOR', 'ANY'] as const;
const USER_WALK = ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'NOT_APPLICABLE'] as const;
const USER_BUDGET = ['LOW', 'MEDIUM', 'HIGH'] as const;
const PREF_SIZE = ['BOTH', 'small', 'medium', 'large', 'xlarge'] as const;
const PREF_SEX = ['BOTH', 'male', 'female'] as const;
const PREF_SPECIES = ['DOG', 'CAT', 'BOTH'] as const;

/** Preenche perfis de usuário e UserPreferences aleatoriamente (para testar match score). */
async function seedUserProfilesForMatch() {
  const users = await prisma.user.findMany({
    where: { deactivatedAt: null },
    select: { id: true, name: true },
  });
  if (users.length === 0) return;
  let userUpdated = 0;
  let prefsUpdated = 0;
  for (const user of users) {
    const data: Record<string, unknown> = {};
    if (Math.random() < 0.6) data.housingType = pick(USER_HOUSING);
    if (Math.random() < 0.5) data.hasYard = Math.random() < 0.5;
    if (Math.random() < 0.5) data.hasOtherPets = Math.random() < 0.4;
    if (Math.random() < 0.5) data.hasChildren = Math.random() < 0.3;
    if (Math.random() < 0.5) data.timeAtHome = pick(USER_TIME);
    if (Math.random() < 0.5) data.petsAllowedAtHome = pick(USER_PETS_ALLOWED);
    if (Math.random() < 0.5) data.dogExperience = pick(USER_EXPERIENCE);
    if (Math.random() < 0.5) data.catExperience = pick(USER_EXPERIENCE);
    if (Math.random() < 0.5) data.householdAgreesToAdoption = pick(USER_HOUSEHOLD);
    if (Math.random() < 0.5) data.activityLevel = pick(USER_ACTIVITY);
    if (Math.random() < 0.5) data.preferredPetAge = pick(USER_PET_AGE);
    if (Math.random() < 0.6) data.commitsToVetCare = Math.random() < 0.95;
    if (Math.random() < 0.5) data.walkFrequency = pick(USER_WALK);
    if (Math.random() < 0.5) data.monthlyBudgetForPet = pick(USER_BUDGET);
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data: data as object });
      userUpdated++;
    }
    // UserPreferences (sizePref, sexPref, species)
    const prefsData: { sizePref?: string; sexPref?: string; species?: string } = {};
    if (Math.random() < 0.5) prefsData.sizePref = pick(PREF_SIZE);
    if (Math.random() < 0.5) prefsData.sexPref = pick(PREF_SEX);
    if (Math.random() < 0.3) prefsData.species = pick(PREF_SPECIES);
    if (Object.keys(prefsData).length > 0) {
      await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: prefsData,
        create: { userId: user.id, species: prefsData.species ?? 'BOTH', radiusKm: 50, ...prefsData },
      });
      prefsUpdated++;
    }
  }
  console.log(`Perfis preenchidos em ${userUpdated} usuário(s), preferências em ${prefsUpdated} para testar match score.`);
}

/**
 * Único usuário do seed que é parceiro (conta vinculada a um estabelecimento).
 * Login: parceiro@adopet.com.br / admin123 — acessa o Portal do parceiro no app.
 */
const PARCEIRO_COMERCIAL_EMAIL = 'parceiro@adopet.com.br';
const PARCEIRO_COMERCIAL_USER_ID = '33333333-3333-3333-3333-333333333333';

async function seedParceiroComercialUser() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: PARCEIRO_COMERCIAL_EMAIL },
    update: { passwordHash, name: 'Parceiro Comercial Teste' },
    create: {
      id: PARCEIRO_COMERCIAL_USER_ID,
      email: PARCEIRO_COMERCIAL_EMAIL,
      passwordHash,
      name: 'Parceiro Comercial Teste',
    },
  });
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, species: 'BOTH', radiusKm: 50 },
  });

  let partner = await prisma.partner.findFirst({
    where: { userId: user.id },
  });
  if (!partner) {
    partner = await prisma.partner.create({
      data: {
        userId: user.id,
        type: 'STORE',
        name: 'Clínica Vet Amigo',
        slug: 'clinica-vet-amigo-seed',
        city: 'Recife',
        description: 'Clínica e pet shop de teste. Use este usuário para testar o portal do parceiro no app.',
        website: 'https://exemplo.com',
        email: PARCEIRO_COMERCIAL_EMAIL,
        phone: '(81) 99999-3333',
        active: true,
        approvedAt: new Date(),
        isPaidPartner: true,
        subscriptionStatus: 'active',
        planId: 'BASIC',
      },
    });
    console.log('Parceiro comercial (com usuário) criado: Clínica Vet Amigo');
  }
  return partner.id;
}

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

  if (petCount < PETS.length) {
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

  // Parceiros ONG + comerciais (lista, detalhe, cupons)
  await seedPartners();

  try {
    // Usuário parceiro comercial para testar portal (parceiro@adopet.com.br)
    await seedParceiroComercialUser();
    // Cupons e serviços dos parceiros comerciais (visíveis na página do parceiro e marketplace)
    await seedPartnerCoupons();
    await seedPartnerServices();
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'P2022' || (typeof err?.message === 'string' && err.message.includes('does not exist'))) {
      console.warn('Parceiros comerciais e cupons ignorados: o banco não tem as colunas mais recentes (userId, etc.). Rode: pnpm exec prisma migrate dev');
    } else {
      throw e;
    }
  }

  // Feature flags iniciais (scope GLOBAL; valor pode ser alterado no painel admin)
  const defaultFlags: Array<{ key: string; enabled: boolean; description: string }> = [
    {
      key: 'REQUIRE_EMAIL_VERIFICATION',
      enabled: false,
      description: 'Quando ligada, o cadastro exige confirmação de e-mail antes do login; signup envia link de confirmação.',
    },
    { key: 'NGO_PRO_UI_ENABLED', enabled: false, description: 'Exibe UI de Ferramentas PRO / Plano ONG no app e portal.' },
    { key: 'NGO_PRO_BILLING_ENABLED', enabled: false, description: 'Permite checkout/cancel da assinatura ONG PRO.' },
    { key: 'NGO_PRO_FEATURES_ENABLED', enabled: false, description: 'Habilita uso de CRM, bulk upload e export (requer também assinatura/sponsor ativo).' },
    { key: 'NGO_SPONSORSHIP_UI_ENABLED', enabled: false, description: 'Exibe seção "Patrocinar ONG" no portal do parceiro comercial.' },
    { key: 'NGO_SPONSORSHIP_BILLING_ENABLED', enabled: false, description: 'Permite checkout/cancel de patrocínio (parceiro paga PRO para ONG).' },
    { key: 'DONATIONS_UI_ENABLED', enabled: false, description: 'Exibe tela "Apoiar" (doações) no app.' },
    { key: 'DONATIONS_BILLING_ENABLED', enabled: false, description: 'Permite criar payment-intent de doação.' },
  ];
  for (const f of defaultFlags) {
    const existing = await prisma.featureFlag.findFirst({
      where: { key: f.key, scope: 'GLOBAL', cityId: null, partnerId: null },
    });
    if (existing) {
      // não sobrescreve (preserva valor do painel)
    } else {
      await prisma.featureFlag.create({
        data: { key: f.key, enabled: f.enabled, description: f.description, scope: 'GLOBAL' },
      });
    }
    console.log('Feature flag garantida:', f.key);
  }

  // Para cada usuário cadastrado na base: pets com possível vínculo a ONG
  await seedPetsForExistingUsers();

  // Até 40 pets em várias cidades de PE (dono: primeiro usuário)
  await seedPetsPernambuco();

  // ~30 pets em San Francisco (USA) e ~30 em São Paulo capital, todos com fotos
  await seedPetsSanFranciscoAndSaoPaulo();

  // Garante que todo pet sem foto receba uma (cachorro ou gato conforme espécie)
  await assignPlaceholderPhotosToPetsWithoutMedia();

  // Logos de parceiros sem logo
  await assignPlaceholderLogosToPartners();

  // Preferências de pets e perfis de usuários para testar match score
  await seedPetPreferencesForMatch();
  await seedUserProfilesForMatch();

  console.log('Seed concluído.');
  console.log('  Login admin: admin@adopet.com.br / ' + SEED_PASSWORD);
  console.log('  Login admin (teste): admin-teste@adopet.com.br / ' + SEED_PASSWORD);
  console.log('  Login parceiro (portal): ' + PARCEIRO_COMERCIAL_EMAIL + ' / ' + SEED_PASSWORD);
  console.log('  Para ver o link Administração, defina no .env da API:');
  console.log('  ADMIN_USER_IDS=' + ADMIN_TESTE_USER_ID);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
