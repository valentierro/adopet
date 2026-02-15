/**
 * E2E: Health check (não exige autenticação).
 * Garante que a API sobe e responde em GET /v1/health.
 */
import { createApp } from '../src/app-bootstrap';
import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health retorna 200 e status ok', async () => {
    const agent = request(app.getHttpServer()) as request.SuperTest<request.Test>;
    const res = await agent.get('/v1/health').expect(200);
    expect((res as unknown as { body: Record<string, unknown> }).body).toHaveProperty('status', 'ok');
    expect((res as unknown as { body: Record<string, unknown> }).body).toHaveProperty('service', 'adopet-api');
    expect((res as unknown as { body: Record<string, unknown> }).body).toHaveProperty('timestamp');
  });
});
