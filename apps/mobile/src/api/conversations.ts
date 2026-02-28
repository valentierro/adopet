import { api } from './client';

export type ConversationListItem = {
  id: string;
  petId: string;
  createdAt: string;
  updatedAt: string;
  pet: { id: string; name: string; photos: string[]; adoptionFinalized?: boolean };
  otherUser: { id: string; name: string; avatarUrl?: string; kycVerified?: boolean };
  lastMessage?: { content: string; createdAt: string; senderId: string };
  unreadCount: number;
};

export async function getConversations(): Promise<ConversationListItem[]> {
  return api.get<ConversationListItem[]>('/conversations');
}

export async function getBlockedConversations(): Promise<ConversationListItem[]> {
  return api.get<ConversationListItem[]>('/conversations/blocked');
}

export async function createConversation(petId: string, adopterId?: string): Promise<{ id: string }> {
  return api.post<{ id: string }>('/conversations', adopterId != null ? { petId, adopterId } : { petId });
}

export type ConversationDetail = {
  id: string;
  type?: 'NORMAL' | 'ADOPTION_CONFIRMATION';
  petId?: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl?: string;
    city?: string;
    housingType?: string;
    hasYard?: boolean;
    hasOtherPets?: boolean;
    hasChildren?: boolean;
    timeAtHome?: string;
    kycVerified?: boolean;
    /** Parceiro (dono de ONG/estabelecimento ou membro) não precisa de KYC para adoção */
    isPartner?: boolean;
  };
  pet?: { name: string; photoUrl?: string; species?: string; size?: string; age?: number; adoptionFinalized?: boolean; adopterHasConfirmed?: boolean; pendingAdopterId?: string; isTutor?: boolean; status?: string; canAdopterDecline?: boolean };
  otherUserTyping?: boolean;
  /** Quando true, o outro participante saiu/foi desativado; chat bloqueado para novas mensagens. */
  otherUserDeactivated?: boolean;
};

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/conversations/${conversationId}`);
}

export async function postConversationTyping(conversationId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/conversations/${conversationId}/typing`, {});
}

export async function deleteConversation(conversationId: string): Promise<void> {
  return api.delete(`/conversations/${conversationId}`);
}
