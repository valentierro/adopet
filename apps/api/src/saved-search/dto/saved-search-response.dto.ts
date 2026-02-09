import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SavedSearchItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  species?: string | null;

  @ApiPropertyOptional()
  size?: string | null;

  @ApiPropertyOptional()
  breed?: string | null;

  @ApiPropertyOptional()
  latitude?: number | null;

  @ApiPropertyOptional()
  longitude?: number | null;

  @ApiProperty()
  radiusKm: number;

  @ApiProperty()
  createdAt: string;
}
