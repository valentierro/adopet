import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartnerServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  priceDisplay?: string;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional()
  validUntil?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
