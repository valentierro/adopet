/**
 * Helpers para testes E2E: app Nest, agent supertest e login.
 * Requer banco com seed (usuário admin@adopet.com.br / admin123 ou E2E_TEST_*).
 */
import { createApp } from '../src/app-bootstrap';
import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'admin@adopet.com.br';
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'admin123';

/**
 * Agent supertest. Tipagem do @types/supertest não expõe .set/.send na cadeia;
 * usar este agent garante que .get().set().send().expect() compile.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAgent(app: INestApplication): any {
  return request(app.getHttpServer());
}

export async function loginAndGetToken(app: INestApplication): Promise<string | null> {
  const agent = getAgent(app);
  const res = await agent
    .post('/v1/auth/login')
    .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD });
  const body = (res as unknown as { body?: { accessToken?: string } }).body;
  return body?.accessToken ?? null;
}

export function authHeaders(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Resposta HTTP com body genérico. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function responseBody<T = Record<string, unknown>>(res: any): T {
  return (res && res.body) as T;
}

export { createApp, E2E_TEST_EMAIL, E2E_TEST_PASSWORD };
