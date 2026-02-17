import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsIn,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePetDto {
  @ApiProperty({ example: 'Rex' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'dog', enum: ['dog', 'cat'] })
  @IsString()
  @IsIn(['dog', 'cat'])
  species: string;

  @ApiPropertyOptional({ example: 'Golden Retriever', description: 'Raça (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  breed?: string;

  @ApiProperty({ example: 2, minimum: 0, maximum: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  age: number;

  @ApiProperty({ example: 'male', enum: ['male', 'female'] })
  @IsString()
  @IsIn(['male', 'female'])
  sex: string;

  @ApiProperty({ example: 'medium', enum: ['small', 'medium', 'large', 'xlarge'] })
  @IsString()
  @IsIn(['small', 'medium', 'large', 'xlarge'])
  size: string;

  @ApiProperty()
  @IsBoolean()
  vaccinated: boolean;

  @ApiProperty()
  @IsBoolean()
  neutered: boolean;

  @ApiProperty({ example: 'Cão dócil e brincalhão.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ example: 'Mudança de cidade', description: 'Por que está doando (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adoptionReason?: string;

  @ApiPropertyOptional({ example: 'dry', enum: ['dry', 'wet', 'mixed', 'natural', 'other'], description: 'Tipo de alimentação (opcional)' })
  @IsOptional()
  @IsString()
  @IsIn(['dry', 'wet', 'mixed', 'natural', 'other'])
  feedingType?: string;

  @ApiPropertyOptional({ example: 'Ração premium; sem alergias conhecidas.', description: 'Dieta especial, alergias ou observações (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedingNotes?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Nível de energia (calmo / moderado / agitado)' })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  energyLevel?: string;

  @ApiPropertyOptional({ maxLength: 500, description: 'Comorbidades ou necessidades especiais (texto livre)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  healthNotes?: string;

  @ApiPropertyOptional({ description: 'Necessita cuidados especiais' })
  @IsOptional()
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNKNOWN'], description: 'Se dá bem com outros cachorros' })
  @IsOptional()
  @IsString()
  @IsIn(['YES', 'NO', 'UNKNOWN'])
  goodWithDogs?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNKNOWN'], description: 'Se dá bem com gatos' })
  @IsOptional()
  @IsString()
  @IsIn(['YES', 'NO', 'UNKNOWN'])
  goodWithCats?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNKNOWN'], description: 'Se dá bem com crianças' })
  @IsOptional()
  @IsString()
  @IsIn(['YES', 'NO', 'UNKNOWN'])
  goodWithChildren?: string;

  @ApiPropertyOptional({ enum: ['CALM', 'PLAYFUL', 'SHY', 'SOCIABLE', 'INDEPENDENT'], description: 'Temperamento' })
  @IsOptional()
  @IsString()
  @IsIn(['CALM', 'PLAYFUL', 'SHY', 'SOCIABLE', 'INDEPENDENT'])
  temperament?: string;

  @ApiPropertyOptional({ description: 'É dócil (manso/calmo com pessoas)' })
  @IsOptional()
  @IsBoolean()
  isDocile?: boolean;

  @ApiPropertyOptional({ description: 'É adestrado' })
  @IsOptional()
  @IsBoolean()
  isTrained?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  /** Para testes: URL de imagem placeholder quando o pet é cadastrado sem fotos. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'ID do parceiro (ONG) quando o anúncio é em parceria' })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional({ enum: ['CASA', 'APARTAMENTO', 'INDIFERENTE'], description: 'Preferência de moradia do tutor (match); INDIFERENTE dá match com casa ou apartamento' })
  @IsOptional()
  @IsString()
  @IsIn(['CASA', 'APARTAMENTO', 'INDIFERENTE'])
  preferredTutorHousingType?: string;

  @ApiPropertyOptional({ description: 'Pet prefere tutor com quintal' })
  @IsOptional()
  @IsBoolean()
  preferredTutorHasYard?: boolean;

  @ApiPropertyOptional({ description: 'Pet se adapta a outros pets no local' })
  @IsOptional()
  @IsBoolean()
  preferredTutorHasOtherPets?: boolean;

  @ApiPropertyOptional({ description: 'Pet se adapta a crianças em casa' })
  @IsOptional()
  @IsBoolean()
  preferredTutorHasChildren?: boolean;

  @ApiPropertyOptional({ enum: ['MOST_DAY', 'HALF_DAY', 'LITTLE'], description: 'Preferência de tempo em casa do tutor' })
  @IsOptional()
  @IsString()
  @IsIn(['MOST_DAY', 'HALF_DAY', 'LITTLE'])
  preferredTutorTimeAtHome?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNSURE'], description: 'Pets permitidos no local do tutor' })
  @IsOptional()
  @IsString()
  @IsIn(['YES', 'NO', 'UNSURE'])
  preferredTutorPetsAllowedAtHome?: string;

  @ApiPropertyOptional({ enum: ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'], description: 'Preferência de experiência com cachorro' })
  @IsOptional()
  @IsString()
  @IsIn(['NEVER', 'HAD_BEFORE', 'HAVE_NOW'])
  preferredTutorDogExperience?: string;

  @ApiPropertyOptional({ enum: ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'], description: 'Preferência de experiência com gato' })
  @IsOptional()
  @IsString()
  @IsIn(['NEVER', 'HAD_BEFORE', 'HAVE_NOW'])
  preferredTutorCatExperience?: string;

  @ApiPropertyOptional({ enum: ['YES', 'DISCUSSING'], description: 'Preferência: todos em casa concordam com adoção' })
  @IsOptional()
  @IsString()
  @IsIn(['YES', 'DISCUSSING'])
  preferredTutorHouseholdAgrees?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'INDIFERENTE'], description: 'Prefere tutor que passeie com essa frequência' })
  @IsOptional()
  @IsString()
  @IsIn(['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'INDIFERENTE'])
  preferredTutorWalkFrequency?: string;

  @ApiPropertyOptional({ description: 'Pet tem gastos contínuos (medicação, ração especial) — para match com orçamento do adotante' })
  @IsOptional()
  @IsBoolean()
  hasOngoingCosts?: boolean;
}
