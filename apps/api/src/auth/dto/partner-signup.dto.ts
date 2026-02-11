import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

const PHONE_REGEX = /^[0-9]{10,11}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const USERNAME_REGEX = /^[a-z0-9._]+$/;

/** Cadastro de usuário + criação de parceiro comercial (estabelecimento). Mesmos campos do signup + nome do estabelecimento e plano. */
export class PartnerSignupDto {
  @ApiProperty({ example: 'user@empresa.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @Matches(PASSWORD_REGEX, { message: 'Senha deve ter pelo menos uma letra e um número' })
  password: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '11987654321' })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Informe um telefone válido com DDD (10 ou 11 dígitos)' })
  phone: string;

  @ApiProperty({ example: 'maria.silva' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Matches(USERNAME_REGEX, { message: 'Use apenas letras minúsculas, números, ponto e underscore' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase().replace(/^@/, '') : value))
  username: string;

  @ApiProperty({ example: 'Clínica Veterinária Amor de Patas', description: 'Nome do estabelecimento/loja' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  establishmentName: string;

  @ApiPropertyOptional({ example: 'PF', enum: ['PF', 'CNPJ'], description: 'Pessoa física (CPF) ou jurídica (CNPJ)' })
  @IsOptional()
  @IsString()
  @IsIn(['PF', 'CNPJ'])
  personType?: 'PF' | 'CNPJ';

  @ApiPropertyOptional({ example: '12345678901', description: 'CPF (apenas dígitos, 11) – obrigatório se personType = PF' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cpf?: string;

  @ApiPropertyOptional({ example: '12345678000199', description: 'CNPJ (apenas dígitos, 14) – obrigatório se personType = CNPJ' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  cnpj?: string;

  @ApiPropertyOptional({ example: 'Clínica Veterinária Amor de Patas Ltda', description: 'Razão social (obrigatório se personType = CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: 'Amor de Patas', description: 'Nome fantasia (obrigatório se personType = CNPJ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiPropertyOptional({ description: 'Endereço completo do estabelecimento' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'BASIC', enum: ['BASIC', 'DESTAQUE', 'PREMIUM'], description: 'Plano escolhido; após pagamento a assinatura será ativada' })
  @IsOptional()
  @IsString()
  @IsIn(['BASIC', 'DESTAQUE', 'PREMIUM'])
  planId?: string;
}
