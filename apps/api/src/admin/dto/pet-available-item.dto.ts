import { ApiProperty } from '@nestjs/swagger';

export class PetAvailableItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Rex' })
  name: string;

  @ApiProperty({ example: 'Maria Silva' })
  ownerName: string;

  @ApiProperty()
  ownerId: string;
}
