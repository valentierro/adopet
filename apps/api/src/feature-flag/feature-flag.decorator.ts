import { SetMetadata } from '@nestjs/common';
import type { FeatureFlagContext } from './feature-flag.service';
import type { ExecutionContext } from '@nestjs/common';
import {
  FEATURE_FLAG_KEY_METADATA,
  FEATURE_FLAG_CONTEXT_RESOLVER_METADATA,
} from './feature-flag.guard';

/**
 * Protege o endpoint com uma feature flag. Se a flag estiver desabilitada, retorna 403 com code FEATURE_DISABLED.
 * @param key Nome da flag (ex: NGO_PRO_BILLING_ENABLED)
 * @param contextResolver Opcional: função que extrai userId/cityId/partnerId do request para escopo regional/piloto
 */
export function FeatureFlag(
  key: string,
  contextResolver?: (context: ExecutionContext) => FeatureFlagContext | Promise<FeatureFlagContext>,
) {
  const applyKey = SetMetadata(FEATURE_FLAG_KEY_METADATA, key);
  const applyResolver = contextResolver
    ? SetMetadata(FEATURE_FLAG_CONTEXT_RESOLVER_METADATA, contextResolver)
    : () => {};
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    applyKey(target, propertyKey, descriptor);
    applyResolver(target, propertyKey, descriptor);
    return descriptor;
  };
}
