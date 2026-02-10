import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Igual ao JwtAuthGuard, mas não lança quando não há token ou é inválido:
 * deixa a requisição seguir e req.user fica undefined. Útil para endpoints
 * que aceitam usuário opcional (ex.: reportar bug com ou sem login).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser | undefined {
    if (user) return user;
    return undefined;
  }
}
