import { api } from './client';

export type MessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  readAt?: string;
};

export type MessagesPage = {
  items: MessageItem[];
  nextCursor: string | null;
};

export async function getMessages(
  conversationId: string,
  cursor?: string,
): Promise<MessagesPage> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  return api.get<MessagesPage>(`/conversations/${conversationId}/messages`, params);
}

export type SendMessagePayload = { content?: string; imageUrl?: string };

export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload,
): Promise<MessageItem> {
  return api.post<MessageItem>(`/conversations/${conversationId}/messages`, payload);
}
