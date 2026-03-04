import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsBoolean, IsOptional } from 'class-validator';

export class SubmitKycDto {
  @ApiProperty({ description: 'Chave da selfie com a frente do documento no storage (obtida após upload via presign)' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  selfieWithDocKey: string;

  @ApiProperty({
    description:
      'Chave do verso do documento (RG). Opcional; use quando enviar RG para que a data de nascimento seja conferida automaticamente (na frente do RG geralmente não vem).',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  documentVersoKey?: string;

  @ApiProperty({
    description:
      'Confirmação de que o usuário leu e aceita que as fotos serão usadas apenas para análise e excluídas após a decisão (obrigatório).',
  })
  @IsBoolean()
  consentGiven: boolean;
}
