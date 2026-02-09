import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class RequestVerificationDto {
  @ApiProperty({ enum: ['USER_VERIFIED', 'PET_VERIFIED'] })
  @IsString()
  @IsIn(['USER_VERIFIED', 'PET_VERIFIED'])
  type: 'USER_VERIFIED' | 'PET_VERIFIED';

  @ApiPropertyOptional({ description: 'Obrigatório quando type é PET_VERIFIED' })
  @IsOptional()
  @IsUUID()
  petId?: string;
}
