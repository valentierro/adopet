import { api } from './client';

export type CreatePartnerRecommendationBody = {
  suggestedName: string;
  suggestedType: 'ONG' | 'CLINIC' | 'STORE';
  suggestedCity?: string;
  suggestedEmail?: string;
  suggestedPhone?: string;
  message?: string;
};

export async function createPartnerRecommendation(
  body: CreatePartnerRecommendationBody,
): Promise<{ id: string }> {
  return api.post<{ id: string }>('/partner-recommendations', body);
}
