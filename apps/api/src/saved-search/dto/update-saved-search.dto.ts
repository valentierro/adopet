import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsIn, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO para atualizar busca salva. Aceita string vazia para limpar campos opcionais. */
export class UpdateSavedSearchDto {
  @ApiPropertyOptional({ enum: ['DOG', 'CAT', 'BOTH'] })
  @IsOptional()
  @ValidateIf((o) => o.species != null && o.species !== '')
  @IsString()
  @IsIn(['DOG', 'CAT', 'BOTH'])
  species?: string;

  @ApiPropertyOptional({ enum: ['small', 'medium', 'large', 'xlarge'] })
  @IsOptional()
  @ValidateIf((o) => o.size != null && o.size !== '')
  @IsString()
  @IsIn(['small', 'medium', 'large', 'xlarge'])
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.latitude != null)
  @Type(() => Number)
  @IsNumber()
  latitude?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.longitude != null)
  @Type(() => Number)
  @IsNumber()
  longitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.radiusKm != null)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;
}
