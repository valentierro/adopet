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
    sex: string;
    size: string;
    vaccinated: boolean;
    neutered: boolean;
    photos: string[];
    status: string;
    verified?: boolean;
    /** Data do anúncio (quando o pet foi cadastrado) */
    createdAt: string;
    /** Cidade do tutor */
    city?: string | null;
    partner?: { id: string; name: string; slug: string; logoUrl?: string | null };
  };
}
