import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from '../partners/partners.service';
import { CreatePartnerDto } from '../partners/dto/create-partner.dto';

export type BulkResult = { created: number; errors: { row: number; message: string }[] };

/** Parse CSV buffer into rows (first row = headers). Handles quoted fields. */
function parseCsv(buffer: Buffer): string[][] {
  const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const rows: string[][] = [];
  for (const line of lines) {
    const cells: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i += 1;
        let cell = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else if (line[i] === '"') {
            i += 1;
            break;
          } else {
            cell += line[i];
            i += 1;
          }
        }
        cells.push(cell);
        if (line[i] === ',') i += 1;
      } else {
        const comma = line.indexOf(',', i);
        const value = comma === -1 ? line.slice(i) : line.slice(i, comma);
        cells.push(value.trim());
        i = comma === -1 ? line.length : comma + 1;
      }
    }
    rows.push(cells);
  }
  return rows;
}

function getCell(row: string[], index: number): string {
  return (row[index] ?? '').trim();
}

function parseBool(val: string): boolean {
  const v = val.toLowerCase();
  return v === 'true' || v === '1' || v === 'sim' || v === 's' || v === 'yes' || v === 'y';
}

@Injectable()
export class AdminBulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnersService: PartnersService,
  ) {}

  parseCsv(buffer: Buffer): string[][] {
    return parseCsv(buffer);
  }

  /** Bulk create partners from CSV. Header: type,name,slug,city,description,website,logoUrl,phone,email,active,approve,isPaidPartner */
  async bulkCreatePartners(buffer: Buffer): Promise<BulkResult> {
    const rows = parseCsv(buffer);
    if (rows.length < 2) {
      throw new BadRequestException('CSV deve ter linha de cabeçalho e ao menos uma linha de dados.');
    }
    const [header, ...dataRows] = rows;
    const col = (key: string, fallback: number) => {
      const idx = header.findIndex((h) => h.trim().toLowerCase() === key.toLowerCase());
      return idx >= 0 ? idx : fallback;
    };
    const errors: { row: number; message: string }[] = [];
    let count = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;
      const type = getCell(row, col('type', 0));
      const name = getCell(row, col('name', 1));
      const slug = getCell(row, col('slug', 2));
      const city = getCell(row, col('city', 3));
      const description = getCell(row, col('description', 4));
      const website = getCell(row, col('website', 5));
      const logoUrl = getCell(row, col('logoUrl', 6));
      const phone = getCell(row, col('phone', 7));
      const email = getCell(row, col('email', 8));
      const active = getCell(row, col('active', 9));
      const approve = getCell(row, col('approve', 10));
      const isPaidPartner = getCell(row, col('isPaidPartner', 11));

      if (!type || !name) {
        errors.push({ row: rowNum, message: 'Tipo e nome são obrigatórios.' });
        continue;
      }
      if (!['ONG', 'CLINIC', 'STORE'].includes(type.toUpperCase())) {
        errors.push({ row: rowNum, message: 'Tipo deve ser ONG, CLINIC ou STORE.' });
        continue;
      }
      try {
        const dto: CreatePartnerDto = {
          type: type.toUpperCase(),
          name,
          slug: slug || undefined,
          city: city || undefined,
          description: description || undefined,
          website: website || undefined,
          logoUrl: logoUrl || undefined,
          phone: phone || undefined,
          email: email || undefined,
          active: active === '' ? true : parseBool(active),
          approve: approve === '' ? false : parseBool(approve),
          isPaidPartner: isPaidPartner === '' ? false : parseBool(isPaidPartner),
        };
        await this.partnersService.create(dto);
        count += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar parceiro';
        errors.push({ row: rowNum, message: msg });
      }
    }
    return { created: count, errors };
  }

  /** Bulk create partner members. Header: partner_slug,user_email,role */
  async bulkCreatePartnerMembers(buffer: Buffer): Promise<BulkResult> {
    const rows = parseCsv(buffer);
    if (rows.length < 2) {
      throw new BadRequestException('CSV deve ter linha de cabeçalho e ao menos uma linha de dados.');
    }
    const [header, ...dataRows] = rows;
    const idxSlug = header.findIndex((h) => h.toLowerCase().includes('partner') && h.toLowerCase().includes('slug')) >= 0
      ? header.findIndex((h) => h.toLowerCase().includes('partner') && h.toLowerCase().includes('slug'))
      : 0;
    const idxEmail = header.findIndex((h) => h.toLowerCase().includes('email')) >= 0
      ? header.findIndex((h) => h.toLowerCase().includes('email'))
      : 1;
    const idxRole = header.findIndex((h) => h.toLowerCase() === 'role') >= 0
      ? header.findIndex((h) => h.toLowerCase() === 'role')
      : 2;
    const errors: { row: number; message: string }[] = [];
    let count = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;
      const partnerSlug = getCell(row, idxSlug);
      const userEmail = getCell(row, idxEmail);
      const role = getCell(row, idxRole) || undefined;
      if (!partnerSlug || !userEmail) {
        errors.push({ row: rowNum, message: 'partner_slug e user_email são obrigatórios.' });
        continue;
      }
      const partner = await this.prisma.partner.findUnique({ where: { slug: partnerSlug } });
      if (!partner) {
        errors.push({ row: rowNum, message: `Parceiro com slug "${partnerSlug}" não encontrado.` });
        continue;
      }
      if (partner.type !== 'ONG') {
        errors.push({ row: rowNum, message: 'Apenas parceiros do tipo ONG podem ter membros.' });
        continue;
      }
      const user = await this.prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
      if (!user) {
        errors.push({ row: rowNum, message: `Usuário com email "${userEmail}" não encontrado.` });
        continue;
      }
      try {
        await this.prisma.partnerMember.upsert({
          where: {
            partnerId_userId: { partnerId: partner.id, userId: user.id },
          },
          create: { partnerId: partner.id, userId: user.id, role: role || null },
          update: { role: role || null },
        });
        count += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao vincular membro';
        errors.push({ row: rowNum, message: msg });
      }
    }
    return { created: count, errors };
  }

  /** Bulk create pets (announcements). Header: owner_email,name,species,breed,age,sex,size,vaccinated,neutered,description,adoption_reason,partner_slug,photo_url_1,photo_url_2,photo_url_3 */
  async bulkCreatePets(buffer: Buffer): Promise<BulkResult> {
    const rows = parseCsv(buffer);
    if (rows.length < 2) {
      throw new BadRequestException('CSV deve ter linha de cabeçalho e ao menos uma linha de dados.');
    }
    const [header, ...dataRows] = rows;
    const getCol = (key: string, fallbackIndex: number) => {
      const idx = header.findIndex((h) => h.toLowerCase().replace(/_/g, '') === key.toLowerCase().replace(/_/g, ''));
      return idx >= 0 ? idx : fallbackIndex;
    };
    const errors: { row: number; message: string }[] = [];
    let count = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;
      const ownerEmail = getCell(row, getCol('owner_email', 0));
      const name = getCell(row, getCol('name', 1));
      const species = getCell(row, getCol('species', 2));
      const breed = getCell(row, getCol('breed', 3));
      const ageStr = getCell(row, getCol('age', 4));
      const sex = getCell(row, getCol('sex', 5));
      const size = getCell(row, getCol('size', 6));
      const vaccinated = getCell(row, getCol('vaccinated', 7));
      const neutered = getCell(row, getCol('neutered', 8));
      const description = getCell(row, getCol('description', 9));
      const adoptionReason = getCell(row, getCol('adoption_reason', 10));
      const feedingType = getCell(row, getCol('feeding_type', 11));
      const feedingNotes = getCell(row, getCol('feeding_notes', 12));
      const energyLevel = getCell(row, getCol('energy_level', 13));
      const healthNotes = getCell(row, getCol('health_notes', 14));
      const hasSpecialNeedsStr = getCell(row, getCol('has_special_needs', 15));
      const goodWithDogs = getCell(row, getCol('good_with_dogs', 16));
      const goodWithCats = getCell(row, getCol('good_with_cats', 17));
      const goodWithChildren = getCell(row, getCol('good_with_children', 18));
      const temperament = getCell(row, getCol('temperament', 19));
      const isDocileStr = getCell(row, getCol('is_docile', 20));
      const isTrainedStr = getCell(row, getCol('is_trained', 21));
      const preferredTutorHousingType = getCell(row, getCol('preferred_tutor_housing_type', 22));
      const preferredTutorHasYardStr = getCell(row, getCol('preferred_tutor_has_yard', 23));
      const preferredTutorHasOtherPetsStr = getCell(row, getCol('preferred_tutor_has_other_pets', 24));
      const preferredTutorHasChildrenStr = getCell(row, getCol('preferred_tutor_has_children', 25));
      const preferredTutorTimeAtHome = getCell(row, getCol('preferred_tutor_time_at_home', 26));
      const preferredTutorPetsAllowedAtHome = getCell(row, getCol('preferred_tutor_pets_allowed_at_home', 27));
      const preferredTutorDogExperience = getCell(row, getCol('preferred_tutor_dog_experience', 28));
      const preferredTutorCatExperience = getCell(row, getCol('preferred_tutor_cat_experience', 29));
      const preferredTutorHouseholdAgrees = getCell(row, getCol('preferred_tutor_household_agrees', 30));
      const preferredTutorWalkFrequency = getCell(row, getCol('preferred_tutor_walk_frequency', 31));
      const hasOngoingCostsStr = getCell(row, getCol('has_ongoing_costs', 32));
      const partnerSlug = getCell(row, getCol('partner_slug', 33));
      const photo1 = getCell(row, getCol('photo_url_1', 34));
      const photo2 = getCell(row, getCol('photo_url_2', 35));
      const photo3 = getCell(row, getCol('photo_url_3', 36));

      if (!ownerEmail || !name || !species || !description) {
        errors.push({ row: rowNum, message: 'owner_email, name, species e description são obrigatórios.' });
        continue;
      }
      const speciesNorm = species.toUpperCase() === 'CAT' ? 'CAT' : 'DOG';
      const age = parseInt(ageStr, 10);
      if (Number.isNaN(age) || age < 0 || age > 30) {
        errors.push({ row: rowNum, message: 'Idade deve ser número entre 0 e 30.' });
        continue;
      }
      const sexNorm = (sex || 'male').toLowerCase().startsWith('f') ? 'female' : 'male';
      const sizeNorm = (size || 'medium').toLowerCase();
      const validSizes = ['small', 'medium', 'large', 'xlarge'];
      const sizeOk = validSizes.includes(sizeNorm) ? sizeNorm : 'medium';
      const vaccinatedBool = parseBool(vaccinated || 'false');
      const neuteredBool = parseBool(neutered || 'false');
      if (description.length < 10) {
        errors.push({ row: rowNum, message: 'Descrição deve ter ao menos 10 caracteres.' });
        continue;
      }

      const owner = await this.prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase() } });
      if (!owner) {
        errors.push({ row: rowNum, message: `Usuário com email "${ownerEmail}" não encontrado.` });
        continue;
      }

      let partnerId: string | null = null;
      if (partnerSlug) {
        const partner = await this.prisma.partner.findUnique({
          where: { slug: partnerSlug, type: 'ONG', active: true, approvedAt: { not: null } },
        });
        if (!partner) {
          errors.push({ row: rowNum, message: `Parceiro ONG com slug "${partnerSlug}" não encontrado ou não aprovado.` });
          continue;
        }
        partnerId = partner.id;
      }

      const optionalStr = (s: string) => (s && s.trim() ? s.trim() : null);
      const optionalBool = (s: string) => (s && s.trim() ? parseBool(s) : null);
      /** SIM | NAO | INDIFERENTE para preferência de tutor; aceita true/false/sim/não/indiferente. */
      const optionalSimNaoIndiferente = (s: string): 'SIM' | 'NAO' | 'INDIFERENTE' | null => {
        if (!s || !s.trim()) return null;
        const v = s.trim().toUpperCase();
        if (v === 'INDIFERENTE' || v === 'INDIFERENT') return 'INDIFERENTE';
        if (v === 'SIM' || v === 'S' || v === 'YES' || v === 'Y' || v === 'TRUE' || v === '1') return 'SIM';
        if (v === 'NAO' || v === 'NÃO' || v === 'NO' || v === 'N' || v === 'FALSE' || v === '0') return 'NAO';
        return null;
      };
      const validEnum = (val: string, opts: string[]) =>
        val && opts.includes(val.toUpperCase()) ? val.toUpperCase() : null;

      try {
        const pet = await this.prisma.pet.create({
          data: {
            ownerId: owner.id,
            name,
            species: speciesNorm,
            breed: optionalStr(breed),
            age,
            sex: sexNorm,
            size: sizeOk,
            vaccinated: vaccinatedBool,
            neutered: neuteredBool,
            description,
            adoptionReason: optionalStr(adoptionReason),
            feedingType: (() => { const v = optionalStr(feedingType); return v ? v.toLowerCase() : null; })(),
            feedingNotes: optionalStr(feedingNotes),
            energyLevel: validEnum(energyLevel, ['LOW', 'MEDIUM', 'HIGH']),
            healthNotes: (() => { const v = optionalStr(healthNotes); return v ? v.slice(0, 500) : null; })(),
            hasSpecialNeeds: optionalBool(hasSpecialNeedsStr),
            goodWithDogs: validEnum(goodWithDogs, ['YES', 'NO', 'UNKNOWN']),
            goodWithCats: validEnum(goodWithCats, ['YES', 'NO', 'UNKNOWN']),
            goodWithChildren: validEnum(goodWithChildren, ['YES', 'NO', 'UNKNOWN']),
            temperament: validEnum(temperament, ['CALM', 'PLAYFUL', 'SHY', 'SOCIABLE', 'INDEPENDENT']),
            isDocile: optionalBool(isDocileStr),
            isTrained: optionalBool(isTrainedStr),
            preferredTutorHousingType: validEnum(preferredTutorHousingType, ['CASA', 'APARTAMENTO', 'INDIFERENTE']),
            preferredTutorHasYard: optionalSimNaoIndiferente(preferredTutorHasYardStr),
            preferredTutorHasOtherPets: optionalSimNaoIndiferente(preferredTutorHasOtherPetsStr),
            preferredTutorHasChildren: optionalSimNaoIndiferente(preferredTutorHasChildrenStr),
            preferredTutorTimeAtHome: validEnum(preferredTutorTimeAtHome, ['MOST_DAY', 'HALF_DAY', 'LITTLE', 'INDIFERENTE']),
            preferredTutorPetsAllowedAtHome: validEnum(preferredTutorPetsAllowedAtHome, ['YES', 'NO', 'UNSURE']),
            preferredTutorDogExperience: validEnum(preferredTutorDogExperience, ['NEVER', 'HAD_BEFORE', 'HAVE_NOW']),
            preferredTutorCatExperience: validEnum(preferredTutorCatExperience, ['NEVER', 'HAD_BEFORE', 'HAVE_NOW']),
            preferredTutorHouseholdAgrees: validEnum(preferredTutorHouseholdAgrees, ['YES', 'DISCUSSING']),
            preferredTutorWalkFrequency: validEnum(preferredTutorWalkFrequency, ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'INDIFERENTE']),
            hasOngoingCosts: optionalBool(hasOngoingCostsStr),
            status: 'AVAILABLE',
            publicationStatus: 'PENDING',
            partnerId,
          },
        });
        const urls = [photo1, photo2, photo3].filter(Boolean);
        for (let j = 0; j < urls.length; j++) {
          await this.prisma.petMedia.create({
            data: {
              petId: pet.id,
              url: urls[j],
              sortOrder: j,
              isPrimary: j === 0,
            },
          });
        }
        count += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar anúncio';
        errors.push({ row: rowNum, message: msg });
      }
    }
    return { created: count, errors };
  }
}
