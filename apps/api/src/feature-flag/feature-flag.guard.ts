import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService, type FeatureFlagContext } from './feature-flag.service';

export const FEATURE_FLAG_KEY_METADATA = 'featureFlag:key';
export const FEATURE_FLAG_CONTEXT_RESOLVER_METADATA = 'featureFlag:contextResolver';

/** Retorna contexto padrão: userId do request. */
export function defaultFeatureFlagContext(ctx: ExecutionContext): FeatureFlagContext {
  const req = ctx.switchToHttp().getRequest();
  const user = req.user as { id?: string } | undefined;
  return { userId: user?.id };
}

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.get<string>(FEATURE_FLAG_KEY_METADATA, context.getHandler());
    if (!key) return true;

    const resolver =
      this.reflector.get<(ctx: ExecutionContext) => FeatureFlagContext | Promise<FeatureFlagContext>>(
        FEATURE_FLAG_CONTEXT_RESOLVER_METADATA,
        context.getHandler(),
      ) ?? defaultFeatureFlagContext;

    const flagContext = await Promise.resolve(resolver(context));
    const enabled = await this.featureFlagService.isEnabled(key, flagContext);
    if (!enabled) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: 'Recurso temporariamente indisponível.',
      });
    }
    return true;
  }
}
