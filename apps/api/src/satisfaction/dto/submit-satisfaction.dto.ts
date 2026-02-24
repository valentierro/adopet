import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional, IsIn } from 'class-validator';

export class SubmitSatisfactionDto {
  @ApiProperty({ required: false, description: 'ID da adoção (quando a pesquisa veio de notificação pós-adoção)' })
  @IsOptional()
  @IsString()
  adoptionId?: string;

  @ApiProperty({ enum: ['ADOPTER', 'TUTOR'], description: 'Seu papel na adoção (adotante ou tutor)' })
  @IsString()
  @IsIn(['ADOPTER', 'TUTOR'])
  role: 'ADOPTER' | 'TUTOR';

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Confiança no app (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  trustScore: number;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Facilidade de uso (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  easeOfUseScore: number;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Comunicação/clareza (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  communicationScore: number;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Satisfação geral (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  overallScore: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
