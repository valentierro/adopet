import { useState, useCallback, useEffect } from 'react';
import Constants from 'expo-constants';
import { api } from '../api/client';

function parseVersion(s: string): number[] {
  return s.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0).slice(0, 3);
}

function isLessThan(a: string, b: string): boolean {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const na = va[i] ?? 0;
    const nb = vb[i] ?? 0;
    if (na < nb) return true;
    if (na > nb) return false;
  }
  return false;
}

export function useAppVersionCheck() {
  const currentVersion = Constants.expoConfig?.version ?? Constants.manifest?.version ?? '0.0.0';
  const [latestVersion, setLatestVersion] = useState(currentVersion);
  const [minSupportedVersion, setMinSupportedVersion] = useState(currentVersion);
  const [optionalDismissed, setOptionalDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ latestVersion?: string; minSupportedVersion?: string }>('/health/app-config', undefined, {
        skipAuth: true,
        noCache: true,
      })
      .then((res) => {
        if (cancelled) return;
        if (res?.latestVersion) setLatestVersion(res.latestVersion);
        if (res?.minSupportedVersion) setMinSupportedVersion(res.minSupportedVersion);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const forceUpdate = isLessThan(currentVersion, minSupportedVersion);
  const optionalUpdate = !forceUpdate && isLessThan(currentVersion, latestVersion) && !optionalDismissed;

  const optionalShownThisSession = useCallback(() => {
    setOptionalDismissed(true);
  }, []);

  return {
    forceUpdate,
    optionalUpdate,
    currentVersion,
    latestVersion,
    optionalShownThisSession,
  };
}
