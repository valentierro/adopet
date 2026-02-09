import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSavedSearchDto {
  @ApiPropertyOptional({ enum: ['DOG', 'CAT', 'BOTH'] })
  @IsOptional()
  @IsString()
  @IsIn(['DOG', 'CAT', 'BOTH'])
  species?: string;

  @ApiPropertyOptional({ enum: ['small', 'medium', 'large', 'xlarge'] })
  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large', 'xlarge'])
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;
}
