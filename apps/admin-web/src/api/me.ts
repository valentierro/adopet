import { api } from './client';

export type MeResponse = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
};

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me');
}
