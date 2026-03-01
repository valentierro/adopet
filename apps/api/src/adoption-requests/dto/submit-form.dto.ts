import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class SubmitFormDto {
  @ApiProperty({ description: 'Respostas: { questionId: value }' })
  @IsObject()
  answers: Record<string, unknown>;

  @ApiProperty({ description: 'ISO datetime em que o usuário aceitou o uso dos dados (LGPD)' })
  @IsString()
  consentAt: string;
}
