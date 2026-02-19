import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePartnerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Aprovar parceiro (admin)' })
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @ApiPropertyOptional({ description: 'Rejeitar parceiro (admin); opcionalmente informar motivo' })
  @IsOptional()
  @IsBoolean()
  reject?: boolean;

  @ApiPropertyOptional({ description: 'Motivo da rejeição (usado quando reject=true)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Parceria paga: destaque na lista e boost no feed' })
  @IsOptional()
  @IsBoolean()
  isPaidPartner?: boolean;

  @ApiPropertyOptional({ description: 'Endereço completo do estabelecimento' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'PF', enum: ['PF', 'CNPJ'] })
  @IsOptional()
  @IsString()
  @IsIn(['PF', 'CNPJ'])
  personType?: 'PF' | 'CNPJ';

  @ApiPropertyOptional({ description: 'CPF apenas dígitos (11)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cpf?: string;

  @ApiPropertyOptional({ description: 'CNPJ apenas dígitos (14)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Razão social (CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Nome fantasia (CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiPropertyOptional({ example: 'BASIC', enum: ['BASIC', 'DESTAQUE', 'PREMIUM'] })
  @IsOptional()
  @IsString()
  @IsIn(['BASIC', 'DESTAQUE', 'PREMIUM'])
  planId?: string;
}
