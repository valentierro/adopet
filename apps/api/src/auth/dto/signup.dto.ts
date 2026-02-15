import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

/** Telefone: apenas dígitos, 10 ou 11 caracteres (DDD + número). Ex: 11987654321 */
const PHONE_REGEX = /^[0-9]{10,11}$/;
/** Mín. 6 caracteres, pelo menos uma letra e um número */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
/** Nome de usuário: min 2, max 30, apenas a-z 0-9 . _ */
const USERNAME_REGEX = /^[a-z0-9._]+$/;

export class SignupDto {
  @ApiProperty({ example: 'user@adopet.com.br' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
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

  @ApiProperty({ example: '11987654321', description: 'Telefone com DDD (10 ou 11 dígitos)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Informe um telefone válido com DDD (10 ou 11 dígitos)' })
  phone: string;

  @ApiProperty({ example: 'maria.silva', description: 'Nome de usuário único (@nome) para ser encontrado ao indicar adotante' })
  @IsNotEmpty({ message: 'Informe um nome de usuário' })
  @IsString()
  @MinLength(2, { message: 'Nome de usuário deve ter no mínimo 2 caracteres' })
  @MaxLength(30, { message: 'Nome de usuário deve ter no máximo 30 caracteres' })
  @Matches(USERNAME_REGEX, { message: 'Use apenas letras minúsculas, números, ponto e underscore' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase().replace(/^@/, '') : value))
  username: string;
}
