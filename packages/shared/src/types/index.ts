export type Species = 'dog' | 'cat';
export type Sex = 'male' | 'female';
export type PetSize = 'small' | 'medium' | 'large' | 'xlarge';

/** Pontuação e nível do tutor (reconhecimento por pets verificados e adotados). */
export interface TutorStats {
  points: number;
  level: string;
  title: string;
  verifiedCount: number;
  adoptedCount: number;
  /** Quantidade de anúncios (pets) do usuário */
  petsCount?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  /** Indica se o usuário possui verificação aprovada */
  verified?: boolean;
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed?: string;
  age: number;
  sex: Sex;
  size: PetSize;
  vaccinated: boolean;
  neutered: boolean;
  description: string;
  adoptionReason?: string;
  /** Tipo de alimentação: dry, wet, mixed, natural, other */
  feedingType?: string;
  /** Dieta especial, alergias ou observações */
  feedingNotes?: string;
  /** Nível de energia: LOW | MEDIUM | HIGH */
  energyLevel?: string;
  /** Comorbidades ou necessidades especiais */
  healthNotes?: string;
  /** Necessita cuidados especiais */
  hasSpecialNeeds?: boolean;
  /** Se dá bem com outros cachorros: YES | NO | UNKNOWN */
  goodWithDogs?: string;
  /** Se dá bem com gatos: YES | NO | UNKNOWN */
  goodWithCats?: string;
  /** Se dá bem com crianças: YES | NO | UNKNOWN */
  goodWithChildren?: string;
  /** Temperamento: CALM | PLAYFUL | SHY | SOCIABLE | INDEPENDENT */
  temperament?: string;
  /** É dócil (manso/calmo com pessoas) */
  isDocile?: boolean;
  /** É adestrado */
  isTrained?: boolean;
  /** Preferência de tutor (para match); apenas para dono/edição */
  preferredTutorHousingType?: string;
  preferredTutorHasYard?: boolean;
  preferredTutorHasOtherPets?: boolean;
  preferredTutorHasChildren?: boolean;
  preferredTutorTimeAtHome?: string;
  preferredTutorPetsAllowedAtHome?: string;
  preferredTutorDogExperience?: string;
  preferredTutorCatExperience?: string;
  preferredTutorHouseholdAgrees?: string;
  distanceKm?: number;
  /** Score de match com o usuário atual (0–100); apenas no feed quando o pet tem preferências de tutor */
  matchScore?: number | null;
  /** Cidade do tutor (para exibir no feed/mapa) */
  city?: string;
  photos: string[];
  ownerId: string;
  /** Status de adoção (AVAILABLE, IN_PROCESS, ADOPTED) - pode vir da API em respostas do dono */
  status?: string;
  /** Data em que o pet foi adotado (apenas quando status === ADOPTED, em GET /pets/mine) */
  adoptedAt?: string;
  /** Nome de usuário do adotante (apenas em GET /pets/mine quando adotado) */
  adopterUsername?: string;
  /** Data em que um admin rejeitou a marcação de adoção; exibe badge "Rejeitado pelo Adopet" */
  adoptionRejectedAt?: string;
  /** Motivo da rejeição da marcação de adoção (quando adoptionRejectedAt está preenchido) */
  adoptionRejectionReason?: string;
  /** True quando a Adopet confirmou a adoção (admin ou 48h); apenas para pet adotado (GET /pets/mine) */
  confirmedByAdopet?: boolean;
  /** Status de moderação do anúncio: PENDING = Em análise, APPROVED = aprovado, REJECTED = rejeitado */
  publicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  /** Motivo da rejeição do anúncio (quando publicationStatus === REJECTED) */
  publicationRejectionReason?: string;
  /** Data em que o anúncio expira (vida útil 60 dias); null = sem expiração */
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Indica se o pet possui verificação aprovada */
  verified?: boolean;
  /** Parceiro (ONG/Clínica/Loja) quando o anúncio é em parceria */
  partner?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    /** Parceria paga: destaque na lista e boost no feed */
    isPaidPartner?: boolean;
    /** ONG | CLINIC | STORE */
    type?: string;
  };
  /** Dados do tutor (apenas em GET /pets/:id) */
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
    /** Pontuação e nível do tutor (pets verificados/adotados) */
    tutorStats?: TutorStats;
  };
  /** Mídias com id para edição (reordenar/remover) */
  mediaItems?: { id: string; url: string; sortOrder: number }[];
}

export type SwipeDirection = 'like' | 'pass';

export interface Swipe {
  id: string;
  userId: string;
  petId: string;
  direction: SwipeDirection;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  petId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
}
