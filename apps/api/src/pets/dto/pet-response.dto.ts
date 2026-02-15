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

  @ApiPropertyOptional({ enum: ['dry', 'wet', 'mixed', 'natural', 'other'], description: 'Tipo de alimentação (opcional)' })
  feedingType?: string;

  @ApiPropertyOptional({ description: 'Dieta especial, alergias ou observações (opcional)' })
  feedingNotes?: string;

  @ApiProperty({ required: false })
  distanceKm?: number;

  @ApiPropertyOptional({ description: 'Cidade do tutor (para exibir no feed/mapa)' })
  city?: string;

  @ApiProperty({ type: [String] })
  photos: string[];

  @ApiProperty()
  ownerId: string;

  @ApiProperty({ enum: ['AVAILABLE', 'IN_PROCESS', 'ADOPTED'] })
  status: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'], description: 'Status de moderação do anúncio (ex.: Em análise)' })
  publicationStatus?: string;

  @ApiPropertyOptional({ description: 'Data em que o anúncio expira (vida útil 60 dias); null = sem expiração' })
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Data em que o pet foi adotado (apenas quando status === ADOPTED)' })
  adoptedAt?: string;

  @ApiPropertyOptional({ description: 'Nome de usuário do adotante (apenas em GET /pets/mine quando adotado)' })
  adopterUsername?: string;

  @ApiPropertyOptional({ description: 'Data em que um admin rejeitou a marcação de adoção; exibe badge "Rejeitado pelo Adopet"' })
  adoptionRejectedAt?: string;

  @ApiPropertyOptional({ description: 'True quando a Adopet confirmou a adoção (admin ou 48h); apenas para pet adotado' })
  confirmedByAdopet?: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Indica se o pet possui verificação aprovada' })
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Parceiro (ONG) quando o anúncio é em parceria' })
  partner?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    /** Parceria paga: destaque e boost no feed' */
    isPaidPartner?: boolean;
  };

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
