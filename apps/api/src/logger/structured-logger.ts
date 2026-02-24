import { LoggerService } from '@nestjs/common';

const isProd = process.env.NODE_ENV === 'production';

export type LogContext = Record<string, unknown> & {
  requestId?: string;
  path?: string;
  userId?: string;
};

/**
 * Logger que em produção:
 * - Emite apenas níveis "warn" e "error".
 * - Formato JSON por linha (level, message, timestamp, ...context) para Vercel Logs / agregadores.
 * Em desenvolvimento: saída legível para humanos em todos os níveis.
 */
export class StructuredLogger implements LoggerService {
  private static instance: StructuredLogger | null = null;

  static setInstance(logger: StructuredLogger): void {
    StructuredLogger.instance = logger;
  }

  static getInstance(): StructuredLogger | null {
    return StructuredLogger.instance;
  }

  private write(level: string, message: string, context?: string, meta?: LogContext): void {
    if (isProd) {
      if (level !== 'warn' && level !== 'error') return;
      const payload: Record<string, unknown> = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(context && { context }),
        ...meta,
      };
      const line = JSON.stringify(payload);
      if (level === 'error') process.stderr.write(line + '\n');
      else process.stdout.write(line + '\n');
    } else {
      const prefix = context ? `[${context}] ` : '';
      const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      const out = `${prefix}${message}${metaStr}`;
      if (level === 'error') console.error(level.toUpperCase(), out);
      else if (level === 'warn') console.warn(level.toUpperCase(), out);
      else console.log(level.toUpperCase(), out);
    }
  }

  log(message: string, context?: string): void {
    this.write('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.write('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: string, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    this.write('verbose', message, context);
  }
}

/**
 * Redireciona console.warn e console.error em produção para o logger estruturado,
 * para que chamadas existentes (ex.: console.warn('[Service] ...')) saiam em JSON.
 * Chamar após StructuredLogger.setInstance(logger).
 */
export function patchConsoleToStructuredLogger(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const logger = StructuredLogger.getInstance();
  if (!logger) return;

  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logger.warn(message);
  };
  console.error = (...args: unknown[]) => {
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logger.error(message);
  };
}
