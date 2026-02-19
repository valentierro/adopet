import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength, MinLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePartnerDto {
  @ApiProperty({ example: 'ONG', enum: ['ONG', 'CLINIC', 'STORE'] })
  @IsString()
  @IsIn(['ONG', 'CLINIC', 'STORE'])
  type: string;

  @ApiProperty({ example: 'Instituto Amor de Patas' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'instituto-amor-de-patas', description: 'Único na base; se omitido, gerado a partir do nome' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Se true, parceiro já fica aprovado ao criar' })
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @ApiPropertyOptional({ description: 'Parceria paga: destaque na lista e boost no feed' })
  @IsOptional()
  @IsBoolean()
  isPaidPartner?: boolean;

  @ApiPropertyOptional({ description: 'Endereço completo do estabelecimento' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'PF', enum: ['PF', 'CNPJ'], description: 'Pessoa física ou jurídica (parceiro comercial)' })
  @IsOptional()
  @IsString()
  @IsIn(['PF', 'CNPJ'])
  personType?: 'PF' | 'CNPJ';

  @ApiPropertyOptional({ description: 'CPF apenas dígitos (11) – quando personType = PF' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cpf?: string;

  @ApiPropertyOptional({ description: 'CNPJ apenas dígitos (14) – quando personType = CNPJ' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Razão social (quando personType = CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Nome fantasia (quando personType = CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiPropertyOptional({ example: 'BASIC', enum: ['BASIC', 'DESTAQUE', 'PREMIUM'] })
  @IsOptional()
  @IsString()
  @IsIn(['BASIC', 'DESTAQUE', 'PREMIUM'])
  planId?: string;

  @ApiPropertyOptional({ description: 'ID do usuário dono (ex.: ao aprovar solicitação de parceria ONG)' })
  @IsOptional()
  @IsString()
  userId?: string;
}
