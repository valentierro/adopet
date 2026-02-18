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

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Nível de energia' })
  energyLevel?: string;

  @ApiPropertyOptional({ description: 'Comorbidades ou necessidades especiais' })
  healthNotes?: string;

  @ApiPropertyOptional({ description: 'Necessita cuidados especiais' })
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNKNOWN'], description: 'Se dá bem com outros cachorros' })
  goodWithDogs?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNKNOWN'], description: 'Se dá bem com gatos' })
  goodWithCats?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNKNOWN'], description: 'Se dá bem com crianças' })
  goodWithChildren?: string;

  @ApiPropertyOptional({ enum: ['CALM', 'PLAYFUL', 'SHY', 'SOCIABLE', 'INDEPENDENT'], description: 'Temperamento' })
  temperament?: string;

  @ApiPropertyOptional({ description: 'É dócil (manso/calmo com pessoas)' })
  isDocile?: boolean;

  @ApiPropertyOptional({ description: 'É adestrado' })
  isTrained?: boolean;

  @ApiPropertyOptional({ description: 'Preferência de tutor (para match); apenas para dono/edição', enum: ['CASA', 'APARTAMENTO', 'INDIFERENTE'] })
  preferredTutorHousingType?: string;

  @ApiPropertyOptional({ description: 'Pet prefere tutor com quintal' })
  preferredTutorHasYard?: boolean;

  @ApiPropertyOptional({ description: 'Pet se adapta a outros pets no local' })
  preferredTutorHasOtherPets?: boolean;

  @ApiPropertyOptional({ description: 'Pet se adapta a crianças em casa' })
  preferredTutorHasChildren?: boolean;

  @ApiPropertyOptional({ enum: ['MOST_DAY', 'HALF_DAY', 'LITTLE'] })
  preferredTutorTimeAtHome?: string;

  @ApiPropertyOptional({ enum: ['YES', 'NO', 'UNSURE'] })
  preferredTutorPetsAllowedAtHome?: string;

  @ApiPropertyOptional({ enum: ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'] })
  preferredTutorDogExperience?: string;

  @ApiPropertyOptional({ enum: ['NEVER', 'HAD_BEFORE', 'HAVE_NOW'] })
  preferredTutorCatExperience?: string;

  @ApiPropertyOptional({ enum: ['YES', 'DISCUSSING'] })
  preferredTutorHouseholdAgrees?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'FEW_TIMES_WEEK', 'RARELY', 'INDIFERENTE'], description: 'Prefere tutor que passeie com essa frequência' })
  preferredTutorWalkFrequency?: string;

  @ApiPropertyOptional({ description: 'Pet tem gastos contínuos (medicação, ração especial)' })
  hasOngoingCosts?: boolean;

  @ApiProperty({ required: false })
  distanceKm?: number;

  @ApiPropertyOptional({ description: 'Score de match com o usuário atual (0–100); apenas no feed quando o pet tem preferências' })
  matchScore?: number | null;

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

  @ApiPropertyOptional({ description: 'Motivo da rejeição da marcação de adoção (quando adoptionRejectedAt está preenchido)' })
  adoptionRejectionReason?: string;

  @ApiPropertyOptional({ description: 'Motivo da rejeição do anúncio na moderação (quando publicationStatus === REJECTED)' })
  publicationRejectionReason?: string;

  @ApiPropertyOptional({ description: 'True quando a Adopet confirmou a adoção (admin ou 48h); apenas para pet adotado' })
  confirmedByAdopet?: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Indica se o pet possui verificação aprovada' })
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Quantidade de pessoas que favoritaram o pet (apenas em GET /pets/mine)' })
  favoritesCount?: number;

  @ApiPropertyOptional({ description: 'Parceiro (ONG/Clínica/Loja) quando o anúncio é em parceria' })
  partner?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    /** Parceria paga: destaque e boost no feed' */
    isPaidPartner?: boolean;
    /** ONG | CLINIC | STORE */
    type?: string;
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
    petsAllowedAtHome?: string;
    dogExperience?: string;
    catExperience?: string;
    householdAgreesToAdoption?: string;
    whyAdopt?: string;
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

/** Item da lista "Pets similares": pet + score de similaridade; quando usuário autenticado, inclui matchScore. */
export class SimilarPetItemDto {
  @ApiProperty({ type: PetResponseDto })
  pet: PetResponseDto;

  @ApiProperty({ description: 'Score de similaridade com o pet de referência (0–100)' })
  similarityScore: number;

  @ApiPropertyOptional({ description: 'Score de match com o perfil do usuário (0–100); presente quando autenticado' })
  matchScore?: number | null;
}
