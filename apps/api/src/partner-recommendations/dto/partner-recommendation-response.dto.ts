import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartnerRecommendationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'ID do usuário que indicou' })
  indicadorUserId: string;

  @ApiPropertyOptional({ description: 'Nome do usuário que indicou (para admin)' })
  indicadorName?: string;

  @ApiPropertyOptional({ description: 'Email do usuário que indicou (para admin)' })
  indicadorEmail?: string;

  @ApiProperty()
  suggestedName: string;

  @ApiProperty({ description: 'ONG | CLINIC | STORE' })
  suggestedType: string;

  @ApiPropertyOptional()
  suggestedCity?: string;

  @ApiPropertyOptional()
  suggestedEmail?: string;

  @ApiPropertyOptional()
  suggestedPhone?: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty({ description: 'Data da indicação (ISO)' })
  createdAt: string;
}
