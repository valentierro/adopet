/**
 * Handler serverless da Vercel: repassa todas as requisições para o Nest (Express).
 * Prisma Client é gerado em ./api/prisma-generated no build para ser incluído no bundle da função.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app-bootstrap';

type HttpHandler = (req: VercelRequest, res: VercelResponse) => void;
let cachedHandler: HttpHandler | null = null;

async function getHandler(): Promise<HttpHandler> {
  if (cachedHandler) return cachedHandler;
  const app = await createApp();
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  cachedHandler = expressApp as unknown as HttpHandler;
  return cachedHandler;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const expressHandler = await getHandler();
    expressHandler(req, res);
  } catch (err) {
    // Log completo para aparecer em Vercel → Project → Logs (evita 500 genérico sem detalhe)
    console.error('[api] FUNCTION_INVOCATION_FAILED', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'FUNCTION_INVOCATION_FAILED',
        message: err instanceof Error ? err.message : 'Internal Server Error',
      });
    }
  }
}
