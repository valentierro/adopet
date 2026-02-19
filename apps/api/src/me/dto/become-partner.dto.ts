import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para usuário já logado se tornar parceiro comercial.
 * Não inclui email, senha nem nome de usuário (vêm da conta existente).
 */
export class BecomePartnerDto {
  @ApiProperty({ example: 'Clínica Veterinária Amor de Patas', description: 'Nome do estabelecimento' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  establishmentName: string;

  @ApiPropertyOptional({ example: 'PF', enum: ['PF', 'CNPJ'] })
  @IsOptional()
  @IsString()
  @IsIn(['PF', 'CNPJ'])
  personType?: 'PF' | 'CNPJ';

  @ApiPropertyOptional({ example: '12345678901', description: 'CPF (apenas dígitos, 11)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cpf?: string;

  @ApiPropertyOptional({ example: '12345678000199', description: 'CNPJ (apenas dígitos, 14)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cnpj?: string;

  @ApiPropertyOptional({ example: 'Clínica Veterinária Amor de Patas Ltda', description: 'Razão social (CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: 'Amor de Patas', description: 'Nome fantasia (CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiPropertyOptional({ description: 'Endereço completo do estabelecimento' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'BASIC', enum: ['BASIC', 'DESTAQUE', 'PREMIUM'] })
  @IsOptional()
  @IsString()
  @IsIn(['BASIC', 'DESTAQUE', 'PREMIUM'])
  planId?: string;
}
