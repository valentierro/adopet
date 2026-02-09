import { Injectable } from '@nestjs/common';

const TYPING_TTL_MS = 5000;

/** Armazena indicador de digitação em memória (convId -> { userId, at }). */
@Injectable()
export class TypingService {
  private readonly store = new Map<string, { userId: string; at: number }>();

  setTyping(conversationId: string, userId: string): void {
    this.store.set(conversationId, { userId, at: Date.now() });
  }

  isOtherUserTyping(conversationId: string, currentUserId: string): boolean {
    const entry = this.store.get(conversationId);
    if (!entry) return false;
    if (entry.userId === currentUserId) return false;
    if (Date.now() - entry.at > TYPING_TTL_MS) {
      this.store.delete(conversationId);
      return false;
    }
    return true;
  }
}
