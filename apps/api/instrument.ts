/**
 * Carrega .env e .env.development (ou .env.production) antes de qualquer outro módulo.
 * Assim a API usa a base/bucket de dev quando NODE_ENV=development.
 */
const path = require('path');
const root = path.resolve(__dirname, '..');
const nodeEnv = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.join(root, '.env') });
require('dotenv').config({ path: path.join(root, `.env.${nodeEnv}`) });

// Log para conferir qual ambiente e qual base estão em uso (não expõe senha)
let dbHost = '(não definido)';
try {
  const u = new URL(process.env.DATABASE_URL || '');
  dbHost = u.hostname;
} catch {
  // ignore
}
console.log(`[Adopet API] NODE_ENV=${nodeEnv} | DATABASE_URL host=${dbHost} | .env.${nodeEnv} carregado`);

/**
 * Inicialização do Sentry (deve ser importada antes de qualquer outro módulo).
 * Sem SENTRY_DSN, o Sentry não envia dados e o app funciona normalmente.
 */
const sentryDsn = process.env.SENTRY_DSN?.trim();
if (sentryDsn) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nestjs');
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}
