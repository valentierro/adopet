/**
 * Inicialização do Sentry (deve ser importada antes de qualquer outro módulo).
 * Sem SENTRY_DSN, o Sentry não envia dados e o app funciona normalmente.
 */
const dsn = process.env.SENTRY_DSN?.trim();
if (dsn) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nestjs');
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}
