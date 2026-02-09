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
  distanceKm?: number;
  photos: string[];
  ownerId: string;
  /** Status de adoção (AVAILABLE, IN_PROCESS, ADOPTED) - pode vir da API em respostas do dono */
  status?: string;
  /** Status de moderação do anúncio: PENDING = Em análise, APPROVED = aprovado, REJECTED = rejeitado */
  publicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  /** Indica se o pet possui verificação aprovada */
  verified?: boolean;
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
