import { PrismaClient } from '@prisma/client';
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

function pick<T>(arr: T[]): T {
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

function pickNeighborhood(): { lat: number; lng: number } {
  const n = SEED_NEIGHBORHOODS[Math.floor(Math.random() * SEED_NEIGHBORHOODS.length)];
  return {
    lat: randomCoord(n.lat, NEIGHBORHOOD_DELTA),
    lng: randomCoord(n.lng, NEIGHBORHOOD_DELTA),
  };
}

// Fotos locais: prisma/seed-images/dogs/1.png..5.png e cats/1.png..5.png (servidas em /v1/seed-photos/)
const SEED_PHOTO_COUNT = 5;
const SEED_PHOTO_EXT = '.png';
const SEED_PHOTO_BASE_URL = process.env.API_PUBLIC_URL || 'http://localhost:3000';

function seedPhotoUrl(folder: 'dogs' | 'cats', index: number): string {
  const num = (index % SEED_PHOTO_COUNT) + 1;
  return `${SEED_PHOTO_BASE_URL}/v1/seed-photos/${folder}/${num}${SEED_PHOTO_EXT}`;
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

/** Cupons de exemplo por slug do parceiro (comercial). */
const SEED_COUPONS: Array<{
  partnerSlug: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  validUntilDays?: number;
}> = [
  { partnerSlug: 'clinica-vet-recife', code: 'ADOPET15', title: '15% na primeira consulta', description: 'Válido para novos clientes', discountType: 'PERCENT', discountValue: 15, validUntilDays: 90 },
  { partnerSlug: 'clinica-vet-recife', code: 'BANHO10', title: '10% em banho e tosa', discountType: 'PERCENT', discountValue: 10, validUntilDays: 60 },
  { partnerSlug: 'pet-shop-animais-felizes', code: 'RACAO20', title: '20% em ração', description: 'Marcas selecionadas', discountType: 'PERCENT', discountValue: 20, validUntilDays: 120 },
  { partnerSlug: 'pet-shop-animais-felizes', code: 'FRETE0', title: 'Frete grátis', description: 'Compras acima de R$ 99', discountType: 'FIXED', discountValue: 0, validUntilDays: 60 },
  { partnerSlug: 'clinica-vet-amigo-seed', code: 'SEED10', title: '10% em qualquer serviço', description: 'Cupom de teste (seed)', discountType: 'PERCENT', discountValue: 10, validUntilDays: 365 },
  { partnerSlug: 'clinica-vet-amigo-seed', code: 'SEED20REAIS', title: 'R$ 20 de desconto', discountType: 'FIXED', discountValue: 2000, validUntilDays: 365 },
];

/** Serviços prestados por parceiro (slug) para exibir na página do parceiro. */
const SEED_SERVICES: Array<{
  partnerSlug: string;
  name: string;
  description?: string;
  priceDisplay?: string;
  validUntilDays?: number;
}> = [
  { partnerSlug: 'clinica-vet-recife', name: 'Consulta veterinária', description: 'Consulta clínica para cães e gatos', priceDisplay: 'A partir de R$ 80' },
  { partnerSlug: 'clinica-vet-recife', name: 'Banho e tosa', description: 'Banho completo e tosa higiênica', priceDisplay: 'A partir de R$ 50' },
  { partnerSlug: 'clinica-vet-recife', name: 'Vacinação', description: 'Aplicação de vacinas (V8, V10, antirrábica)', priceDisplay: 'Sob consulta' },
  { partnerSlug: 'pet-shop-animais-felizes', name: 'Banho', description: 'Banho para cães e gatos', priceDisplay: 'A partir de R$ 35' },
  { partnerSlug: 'pet-shop-animais-felizes', name: 'Hidratação', description: 'Hidratação capilar para pets', priceDisplay: 'R$ 25' },
  { partnerSlug: 'clinica-vet-amigo-seed', name: 'Consulta', description: 'Consulta de rotina (seed)', priceDisplay: 'Sob consulta' },
  { partnerSlug: 'clinica-vet-amigo-seed', name: 'Banho e tosa', description: 'Banho + tosa (seed)', priceDisplay: 'A partir de R$ 45', validUntilDays: 365 },
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
    // Cupons e serviços dos parceiros comerciais (visíveis na página do parceiro)
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

  // Para cada usuário cadastrado na base: pets com possível vínculo a ONG
  await seedPetsForExistingUsers();

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
