/**
 * Handler serverless da Vercel: repassa todas as requisições para o Nest (Express).
 * Prisma Client é gerado em ./api/prisma-generated no build para ser incluído no bundle da função.
 * CORS: aplicado aqui e em vercel.json para o painel admin (admin.appadopet.com.br).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app-bootstrap';

const CORS_ORIGIN = process.env.CORS_ORIGINS?.split(',')[0]?.trim() || 'https://admin.appadopet.com.br';

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

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
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  try {
    const expressHandler = await getHandler();
    expressHandler(req, res);
  } catch (err) {
    // Log completo para aparecer em Vercel → Project → Logs
    console.error('[api] FUNCTION_INVOCATION_FAILED', err);
    if (!res.headersSent) {
      const payload: Record<string, string> = {
        error: 'FUNCTION_INVOCATION_FAILED',
        message: err instanceof Error ? err.message : 'Internal Server Error',
      };
      // Incluir stack na resposta para debug (ver no Network do browser ou em /v1/health)
      if (err instanceof Error && err.stack) payload.stack = err.stack;
      res.status(500).json(payload);
    }
  }
}
