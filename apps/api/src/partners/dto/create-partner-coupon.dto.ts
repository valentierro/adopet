import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MinLength, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartnerCouponDto {
  @ApiProperty({ example: 'ADOPET10', description: 'Código do cupom (ex: ADOPET10)' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: '10% em ração', description: 'Título exibido para o usuário' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Válido para compras acima de R$ 50' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'PERCENT', enum: ['PERCENT', 'FIXED'], description: 'PERCENT = percentual; FIXED = valor fixo em centavos' })
  @IsString()
  @IsIn(['PERCENT', 'FIXED'])
  discountType: string;

  @ApiProperty({ example: 10, description: 'Percentual (ex: 10) ou valor em centavos (ex: 1000 = R$ 10)' })
  @IsNumber()
  @Min(0)
  @Max(100_00_00) // 100% ou 10000 reais em centavos
  @Type(() => Number)
  discountValue: number;

  @ApiPropertyOptional({ description: 'Data de validade (ISO). Se omitido, sem validade' })
  @IsOptional()
  @IsString()
  validUntil?: string;
}
