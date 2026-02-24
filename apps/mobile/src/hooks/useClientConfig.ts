import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type ClientConfig = {
  donationsUiEnabled: boolean;
  latestVersion?: string;
  minSupportedVersion?: string;
};

const DEFAULT_CONFIG: ClientConfig = {
  donationsUiEnabled: false,
};

async function fetchClientConfig(): Promise<ClientConfig> {
  try {
    const res = await api.get<{
      latestVersion?: string;
      minSupportedVersion?: string;
      donationsUiEnabled?: boolean;
    }>('/health/app-config', undefined, { skipAuth: true, noCache: true });
    return {
      donationsUiEnabled: res?.donationsUiEnabled === true,
      latestVersion: res?.latestVersion,
      minSupportedVersion: res?.minSupportedVersion,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useClientConfig() {
  const { data } = useQuery({
    queryKey: ['client-config'],
    queryFn: fetchClientConfig,
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_CONFIG,
  });
  return { config: data ?? DEFAULT_CONFIG };
}
