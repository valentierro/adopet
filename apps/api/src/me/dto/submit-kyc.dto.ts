import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class SubmitKycDto {
  @ApiProperty({ description: 'Chave da selfie com a frente do documento no storage (obtida após upload via presign)' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  selfieWithDocKey: string;

  @ApiProperty({
    description:
      'Confirmação de que o usuário leu e aceita que as fotos serão usadas apenas para análise e excluídas após a decisão (obrigatório).',
  })
  @IsBoolean()
  consentGiven: boolean;
}
