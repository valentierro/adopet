import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartnerCouponResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: ['PERCENT', 'FIXED'] })
  discountType: string;

  @ApiProperty({ description: 'Percentual (ex: 10) ou valor em centavos (ex: 1000)' })
  discountValue: number;

  @ApiPropertyOptional()
  validFrom?: string;

  @ApiPropertyOptional()
  validUntil?: string | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
