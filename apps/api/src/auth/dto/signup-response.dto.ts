import { ApiProperty } from '@nestjs/swagger';

export class SignupResponseDto {
  @ApiProperty({ example: 'Enviamos um e-mail de confirmação. Clique no link para ativar sua conta.' })
  message: string;

  @ApiProperty({ example: true, description: 'Quando true, o usuário precisa confirmar o e-mail antes de fazer login.' })
  requiresEmailVerification: true;
}
