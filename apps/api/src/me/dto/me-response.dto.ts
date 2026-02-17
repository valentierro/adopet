import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ example: 'maria.silva', description: 'Nome de usuário único (@nome) para ser encontrado ao indicar adotante' })
  username?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional({ enum: ['CASA', 'APARTAMENTO'] })
  housingType?: string;

  @ApiPropertyOptional()
  hasYard?: boolean;

  @ApiPropertyOptional()
  hasOtherPets?: boolean;

  @ApiPropertyOptional()
  hasChildren?: boolean;

  @ApiPropertyOptional({ enum: ['MOST_DAY', 'HALF_DAY', 'LITTLE'] })
  timeAtHome?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNSURE'], description: 'Pets permitidos no local' })
  petsAllowedAtHome?: string;

  @ApiPropertyOptional({ enum: ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'], description: 'Experiência com cachorro' })
  dogExperience?: string;

  @ApiPropertyOptional({ enum: ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'], description: 'Experiência com gato' })
  catExperience?: string;

  @ApiPropertyOptional({ enum: ['YES', 'DISCUSSING'], description: 'Todos em casa concordam com a adoção' })
  householdAgreesToAdoption?: string;

  @ApiPropertyOptional({ description: 'Por que quer adotar' })
  whyAdopt?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Nível de atividade' })
  activityLevel?: string;

  @ApiPropertyOptional({ enum: ['PUPPY', 'ADULT', 'SENIOR', 'ANY'], description: 'Idade preferida do pet' })
  preferredPetAge?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO'], description: 'Compromisso com cuidados veterinários' })
  commitsToVetCare?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'NOT_APPLICABLE'], description: 'Frequência de passeios' })
  walkFrequency?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Orçamento mensal para o pet' })
  monthlyBudgetForPet?: string;

  @ApiPropertyOptional({ description: 'Indica se o usuário possui verificação aprovada' })
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Indica se o usuário é administrador (pode acessar painel admin)' })
  isAdmin?: boolean;

  @ApiPropertyOptional({ description: 'Dados do parceiro vinculado (ONG ou comercial)' })
  partner?: {
    id: string;
    name: string;
    slug: string;
    type: string; // ONG | CLINIC | STORE
    subscriptionStatus?: string;
    planId?: string;
    isPaidPartner: boolean;
  };

  @ApiPropertyOptional({ description: 'ONGs das quais o usuário é membro (badge "membro ONG")', type: 'array', items: { type: 'object', properties: { partnerId: { type: 'string' }, partnerName: { type: 'string' }, partnerSlug: { type: 'string' } } } })
  partnerMemberships?: Array<{ partnerId: string; partnerName: string; partnerSlug: string }>;
}
