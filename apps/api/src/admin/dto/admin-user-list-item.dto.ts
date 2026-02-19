import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Quando a conta foi desativada (auto ou ban)' })
  deactivatedAt?: string;

  @ApiPropertyOptional({ description: 'Quando o admin aplicou ban direto' })
  bannedAt?: string;
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserListItemDto] })
  items: AdminUserListItemDto[];

  @ApiProperty()
  total: number;
}
