import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BugReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ description: 'ID do usuário que reportou (null se anônimo)' })
  userId?: string | null;

  @ApiPropertyOptional({ description: 'Nome do usuário (para admin)' })
  userName?: string | null;

  @ApiPropertyOptional({ description: 'Email do usuário (para admin)' })
  userEmail?: string | null;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  stack?: string | null;

  @ApiPropertyOptional()
  screen?: string | null;

  @ApiPropertyOptional()
  userComment?: string | null;

  @ApiProperty()
  createdAt: string;
}
