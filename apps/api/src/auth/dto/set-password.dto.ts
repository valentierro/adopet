import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, MinLength, IsOptional, ValidateIf } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export class SetPasswordDto {
  @ApiProperty({ description: 'Token recebido por e-mail (link definir senha)' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Nova senha (mín. 6 caracteres, letra e número)', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @Matches(PASSWORD_REGEX, { message: 'A senha deve ter pelo menos uma letra e um número.' })
  newPassword: string;

  @ApiPropertyOptional({ description: 'Repetir a senha (obrigatório na página do formulário)' })
  @IsOptional()
  @ValidateIf((o) => o.newPasswordConfirm != null && o.newPasswordConfirm !== '')
  @IsString()
  newPasswordConfirm?: string;
}
