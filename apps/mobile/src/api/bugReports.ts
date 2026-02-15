import { api } from './client';

export type CreateBugReportBody = {
  type?: 'BUG' | 'SUGGESTION';
  message: string;
  stack?: string;
  screen?: string;
  userComment?: string;
};

export async function createBugReport(body: CreateBugReportBody): Promise<{ id: string }> {
  return api.post<{ id: string }>('/bug-reports', body);
}
