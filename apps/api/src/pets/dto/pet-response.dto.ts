import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ example: 'dog' })
  species: string;

  @ApiPropertyOptional({ description: 'Raça (opcional)' })
  breed?: string;

  @ApiProperty()
  age: number;

  @ApiProperty({ example: 'male' })
  sex: string;

  @ApiProperty({ example: 'medium' })
  size: string;

  @ApiProperty()
  vaccinated: boolean;

  @ApiProperty()
  neutered: boolean;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ description: 'Por que está doando (opcional)' })
  adoptionReason?: string;

  @ApiProperty({ required: false })
  distanceKm?: number;

  @ApiProperty({ type: [String] })
  photos: string[];

  @ApiProperty()
  ownerId: string;

  @ApiProperty({ enum: ['AVAILABLE', 'IN_PROCESS', 'ADOPTED'] })
  status: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'], description: 'Status de moderação do anúncio (ex.: Em análise)' })
  publicationStatus?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Indica se o pet possui verificação aprovada' })
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Dados do tutor (apenas em GET /pets/:id)' })
  owner?: {
    id: string;
    name: string;
    avatarUrl?: string;
    petsCount: number;
    verified?: boolean;
    city?: string;
    bio?: string;
    housingType?: string;
    hasYard?: boolean;
    hasOtherPets?: boolean;
    hasChildren?: boolean;
    timeAtHome?: string;
    tutorStats?: {
      points: number;
      level: string;
      title: string;
      verifiedCount: number;
      adoptedCount: number;
    };
  };

  @ApiPropertyOptional({ description: 'Mídias com id para edição (reordenar/remover)' })
  mediaItems?: { id: string; url: string; sortOrder: number }[];
}
