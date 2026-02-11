/**
 * Handler serverless da Vercel: repassa todas as requisições para o Nest (Express).
 * O build (pnpm run build) gera dist/app-bootstrap.js; a Vercel inclui api/ e dist/ no deploy.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { join } from 'path';

let cachedHandler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

async function getHandler(): Promise<(req: VercelRequest, res: VercelResponse) => void> {
  if (cachedHandler) return cachedHandler;
  const bootstrapPath = join(__dirname, '..', 'dist', 'app-bootstrap.js');
  const { createApp } = require(bootstrapPath);
  const app = await createApp();
  await app.init();
  cachedHandler = app.getHttpAdapter().getInstance();
  return cachedHandler;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const expressHandler = await getHandler();
  expressHandler(req, res);
}
