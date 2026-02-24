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

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional()
  validUntil?: string | null;

  @ApiProperty({ description: 'Exibir no marketplace e na página do parceiro' })
  showOnMarketplace: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
