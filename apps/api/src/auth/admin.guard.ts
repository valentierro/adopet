import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('Não autorizado');
    }
    const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()) ?? [];
    if (!adminIds.includes(userId)) {
      throw new ForbiddenException('Acesso restrito a administradores');
    }
    return true;
  }
}
