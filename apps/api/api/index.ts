/**
 * Handler serverless da Vercel: repassa todas as requisições para o Nest (Express).
 * Importa o bootstrap do source para o bundle da função incluir o Nest (dist/ não vai no pacote da função).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app-bootstrap';

let cachedHandler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

async function getHandler(): Promise<(req: VercelRequest, res: VercelResponse) => void> {
  if (cachedHandler) return cachedHandler;
  const app = await createApp();
  await app.init();
  const handler = app.getHttpAdapter().getInstance();
  cachedHandler = handler;
  return handler;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const expressHandler = await getHandler();
  expressHandler(req, res);
}
