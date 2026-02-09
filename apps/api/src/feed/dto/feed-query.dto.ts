import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Raio em km (default: 50)', default: 50 })
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

  @ApiPropertyOptional({ description: 'ID do usuário (preenchido pelo token)' })
  @IsOptional()
  @IsString()
  userId?: string;
}
