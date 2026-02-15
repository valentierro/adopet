/**
 * E2E: Feed e mapa (exige autenticação).
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Feed (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/feed sem token retorna 401', async () => {
    await getAgent(app).get('/v1/feed').expect(401);
  });

  it('GET /v1/feed com token retorna 200 e items', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/feed')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody<{ items: unknown[]; nextCursor: string | null }>(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body).toHaveProperty('nextCursor');
  });

  it('GET /v1/feed/map com token retorna 200 e items (pins)', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/feed/map?lat=-8.05&lng=-34.88&radiusKm=50')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody<{ items: unknown[] }>(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });
});
