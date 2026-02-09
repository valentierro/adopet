import { api } from './client';

export type ReportTargetType = 'USER' | 'PET' | 'MESSAGE';

export type CreateReportBody = {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
};

export type ReportResponse = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  createdAt: string;
};

export async function createReport(body: CreateReportBody): Promise<ReportResponse> {
  return api.post<ReportResponse>('/reports', body);
}
