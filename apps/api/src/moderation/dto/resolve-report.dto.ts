import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class ResolveReportDto {
  @ApiPropertyOptional({ description: 'Feedback para o denunciador (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionFeedback?: string;

  @ApiPropertyOptional({
    description: 'Se true, o usuário alvo da denúncia é banido (conta desativada). Aplica-se a denúncia de USER (targetId), PET (dono do pet) ou MESSAGE (autor da mensagem). Admins não podem ser banidos.',
  })
  @IsOptional()
  @IsBoolean()
  banReportedUser?: boolean;
}
