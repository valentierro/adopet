import { api } from './client';

export type ClientConfig = {
  ngoProUiEnabled: boolean;
  ngoSponsorshipUiEnabled: boolean;
  donationsUiEnabled: boolean;
};

const CLIENT_CONFIG_PATH = '/client-config';

/** Config para UI (feature flags). Auth opcional; com login usa escopo do parceiro/cidade. */
export async function getClientConfig(): Promise<ClientConfig> {
  const data = await api.get<ClientConfig>(CLIENT_CONFIG_PATH, undefined, {
    skipAuth: false,
    noCache: true,
  });
  return {
    ngoProUiEnabled: Boolean(data?.ngoProUiEnabled),
    ngoSponsorshipUiEnabled: Boolean(data?.ngoSponsorshipUiEnabled),
    donationsUiEnabled: Boolean(data?.donationsUiEnabled),
  };
}
