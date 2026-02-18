import { api } from './client';

export type ConversationListItem = {
  id: string;
  petId: string;
  createdAt: string;
  updatedAt: string;
  pet: { id: string; name: string; photos: string[]; adoptionFinalized?: boolean };
  otherUser: { id: string; name: string; avatarUrl?: string };
  lastMessage?: { content: string; createdAt: string; senderId: string };
  unreadCount: number;
};

export async function getConversations(): Promise<ConversationListItem[]> {
  return api.get<ConversationListItem[]>('/conversations');
}

export async function createConversation(petId: string): Promise<{ id: string }> {
  return api.post<{ id: string }>('/conversations', { petId });
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
  };
  pet?: { name: string; photoUrl?: string; species?: string; size?: string; age?: number; adoptionFinalized?: boolean; pendingAdopterId?: string; isTutor?: boolean; status?: string };
  otherUserTyping?: boolean;
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
