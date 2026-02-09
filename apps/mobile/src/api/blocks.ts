import { api } from './client';

export async function blockUser(blockedUserId: string): Promise<{ blocked: true }> {
  return api.post<{ blocked: true }>('/blocks', { blockedUserId });
}

export async function unblockUser(blockedUserId: string): Promise<{ unblocked: true }> {
  return api.delete<{ unblocked: true }>(`/blocks/${blockedUserId}`);
}
