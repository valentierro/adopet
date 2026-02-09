import { ApiProperty } from '@nestjs/swagger';

export class VerificationItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['USER_VERIFIED', 'PET_VERIFIED'] })
  type: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiProperty({ required: false, description: 'Para PET_VERIFIED: id do pet' })
  petId?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class VerificationStatusDto {
  @ApiProperty({ type: [VerificationItemDto] })
  requests: VerificationItemDto[];

  @ApiProperty({ description: 'Usuário possui verificação aprovada' })
  userVerified: boolean;
}
