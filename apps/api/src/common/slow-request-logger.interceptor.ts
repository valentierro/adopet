import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SLOW_MS = 500;

/** Registra duração em toda resposta (header X-Response-Time) e loga requisições lentas (≥ SLOW_MS). */
@Injectable()
export class SlowRequestLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.url ?? request.originalUrl ?? '';

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        response.setHeader('X-Response-Time', `${duration}ms`);
        if (duration >= SLOW_MS) {
          console.warn(`[slow] ${method} ${url} ${duration}ms`);
        }
      }),
    );
  }
}
