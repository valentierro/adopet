import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreatePartnerServiceDto {
  @ApiProperty({ example: 'Banho e tosa', description: 'Nome do serviço' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Banho completo + tosa higiênica para cães' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'A partir de R$ 50', description: 'Preço ou "Sob consulta"' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  priceDisplay?: string;

  @ApiPropertyOptional({ description: 'Data de validade (ISO). Se omitido, sem validade' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'URL da foto do serviço (após upload)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;
}
