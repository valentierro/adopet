import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

/** Telefone: apenas dígitos, 10 ou 11 caracteres (DDD + número). Ex: 11987654321 */
const PHONE_REGEX = /^[0-9]{10,11}$/;
/** Mín. 6 caracteres, pelo menos uma letra e um número */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export class SignupDto {
  @ApiProperty({ example: 'user@adopet.com.br' })
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
}
