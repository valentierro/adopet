import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'senhaAtual123' })
  @IsString()
  @MinLength(6, { message: 'Senha atual inválida.' })
  currentPassword: string;

  @ApiProperty({ example: 'novaSenha456', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' })
  newPassword: string;
}
