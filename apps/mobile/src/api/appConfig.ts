import { api } from './client';

export type AppConfigResponse = {
  latestVersion: string;
  minSupportedVersion: string;
};

export async function getAppConfig(): Promise<AppConfigResponse> {
  return api.get<AppConfigResponse>('/health/app-config', undefined, {
    skipAuth: true,
    noCache: true,
  });
}
