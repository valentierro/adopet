import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FeedQueryDto {
  @ApiPropertyOptional({ description: 'Latitude do usuário' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude do usuário' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ description: 'Raio em km (default: 300)', default: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Cursor para paginação' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Filtro por espécie: BOTH | DOG | CAT' })
  @IsOptional()
  @IsString()
  species?: string;

  @ApiPropertyOptional({ description: 'Filtro por raça (ex: Golden, SRD, Persa)' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ description: 'Filtro por sexo do pet: male | female' })
  @IsOptional()
  @IsString()
  sex?: string;

  @ApiPropertyOptional({ description: 'Filtro por porte: small | medium | large | xlarge' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Filtro por nível de energia' })
  @IsOptional()
  @IsString()
  energyLevel?: string;

  @ApiPropertyOptional({ enum: ['CALM', 'PLAYFUL', 'SHY', 'SOCIABLE', 'INDEPENDENT'], description: 'Filtro por temperamento' })
  @IsOptional()
  @IsString()
  temperament?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO'], description: 'Se dá bem com crianças' })
  @IsOptional()
  @IsString()
  goodWithChildren?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO'], description: 'Se dá bem com cachorros' })
  @IsOptional()
  @IsString()
  goodWithDogs?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO'], description: 'Se dá bem com gatos' })
  @IsOptional()
  @IsString()
  goodWithCats?: string;

  @ApiPropertyOptional({ description: 'Apenas pets com necessidades especiais' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ description: 'Apenas pets dóceis' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDocile?: boolean;

  @ApiPropertyOptional({ description: 'Apenas pets adestrados' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isTrained?: boolean;

  @ApiPropertyOptional({ description: 'ID do usuário (preenchido pelo token)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filtrar anúncios por dono (ex.: perfil do tutor)' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({
    enum: ['all', 'partners_only', 'no_partners'],
    description: 'Filtrar por parceria: all = todos, partners_only = só parceiros (pagos ou não), no_partners = só sem parceria',
  })
  @IsOptional()
  @IsString()
  partnerFilter?: 'all' | 'partners_only' | 'no_partners';
}
