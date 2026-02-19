import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty({ enum: ['USER', 'PET', 'MESSAGE'] })
  targetType: string;

  @ApiProperty()
  targetId: string;

  @ApiProperty()
  reason: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({ description: 'Quando a denúncia foi resolvida pelo admin' })
  resolvedAt?: string;

  @ApiPropertyOptional({ description: 'ID do admin que resolveu' })
  resolvedById?: string;

  @ApiPropertyOptional({ description: 'Feedback enviado ao denunciador ao resolver' })
  resolutionFeedback?: string;

  @ApiPropertyOptional({ description: 'Ação tomada ao resolver (ex.: BAN_USER)' })
  resolutionAction?: string;
}
