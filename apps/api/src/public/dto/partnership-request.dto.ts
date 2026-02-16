import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PartnershipRequestDto {
  @ApiProperty({ enum: ['ong', 'comercial'] })
  @IsEnum(['ong', 'comercial'])
  tipo: 'ong' | 'comercial';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nome: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Nome da instituição (ONG) ou estabelecimento (comercial)' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  instituicao: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  telefone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensagem?: string;

  /** ONG */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  anoFundacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cep?: string;

  @ApiPropertyOptional({ description: 'Endereço formatado (rua, número, bairro, cidade, UF)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  endereco?: string;

  /** Comercial */
  @ApiPropertyOptional({ enum: ['PF', 'CNPJ'] })
  @IsOptional()
  @IsEnum(['PF', 'CNPJ'])
  personType?: 'PF' | 'CNPJ';

  @ApiPropertyOptional({ description: 'CPF ou CNPJ conforme personType' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  documentoComercial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  planoDesejado?: string;
}
