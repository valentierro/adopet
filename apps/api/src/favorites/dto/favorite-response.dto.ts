import { ApiProperty } from '@nestjs/swagger';

export class FavoriteItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  petId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  pet: {
    id: string;
    name: string;
    species: string;
    age: number;
    photos: string[];
    status: string;
    verified?: boolean;
  };
}
