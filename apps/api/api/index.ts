/**
 * Handler serverless da Vercel: repassa todas as requisições para o Nest (Express).
 * Prisma Client é gerado em ../../node_modules/.prisma/client no build para estar disponível em runtime.
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
  const expressHandler = await getHandler();
  expressHandler(req, res);
}
