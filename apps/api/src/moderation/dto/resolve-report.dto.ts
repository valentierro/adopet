import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ResolveReportDto {
  @ApiPropertyOptional({ description: 'Feedback para o denunciador (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionFeedback?: string;
}
