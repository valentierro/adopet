import { api } from './client';

export type PriorityAdopterItem = {
  adopterId: string;
  name: string;
  avatarUrl?: string | null;
  matchScore: number | null;
  profileCompleteness: number;
  hasConversation: boolean;
  conversationId?: string | null;
  priorityScore: number;
};

export async function getPriorityAdopters(petId: string): Promise<PriorityAdopterItem[]> {
  return api.get<PriorityAdopterItem[]>(`/priority-engine/pet/${petId}/adopters`);
}
