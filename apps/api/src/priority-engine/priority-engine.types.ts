export interface PriorityAdopterItem {
  adopterId: string;
  name: string;
  avatarUrl?: string | null;
  /** Match score 0–100 (null se pet sem preferências) */
  matchScore: number | null;
  /** 0–100: percentual de campos do perfil preenchidos (triagem) */
  profileCompleteness: number;
  /** Se já existe conversa com este adotante sobre o pet */
  hasConversation: boolean;
  /** Id da conversa (para abrir o chat); presente quando hasConversation é true */
  conversationId?: string | null;
  /** Score 0–100 para ordenação: combina match, perfil completo e conversa iniciada */
  priorityScore: number;
}
