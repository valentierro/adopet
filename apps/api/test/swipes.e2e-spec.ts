/**
 * E2E: Swipes – like/pass, listar pets que passou, desfazer pass.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Swipes (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  let petIdForSwipe: string | null;
  let petIdPassed: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
    if (accessToken) {
      const feedRes = await getAgent(app).get('/v1/feed').set(authHeaders(accessToken));
      if (feedRes.status === 200) {
        const body = responseBody<{ items: { id: string }[] }>(feedRes);
        const items = body.items ?? [];
        petIdForSwipe = items[0]?.id ?? null;
        petIdPassed = items[1]?.id ?? null;
      }
    }
  }, 30000);

  afterAll(async () => {
    if (accessToken && petIdPassed) {
      await getAgent(app)
        .delete(`/v1/swipes/passed/${petIdPassed}`)
        .set(authHeaders(accessToken))
        .catch(() => {});
    }
    await app.close();
  });

  it('POST /v1/swipes sem token retorna 401', async () => {
    if (!petIdForSwipe) return;
    await getAgent(app)
      .post('/v1/swipes')
      .send({ petId: petIdForSwipe, action: 'like' })
      .expect(401);
  });

  it('POST /v1/swipes registra like', async () => {
    if (!accessToken || !petIdForSwipe) return;
    await getAgent(app)
      .post('/v1/swipes')
      .set(authHeaders(accessToken))
      .send({ petId: petIdForSwipe, action: 'LIKE' })
      .expect(201);
  });

  it('POST /v1/swipes registra pass', async () => {
    if (!accessToken || !petIdPassed) return;
    await getAgent(app)
      .post('/v1/swipes')
      .set(authHeaders(accessToken))
      .send({ petId: petIdPassed, action: 'PASS' })
      .expect(201);
  });

  it('GET /v1/swipes/passed retorna 200 e lista de pets que passou', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/swipes/passed')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody<{ items: unknown[] }>(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('DELETE /v1/swipes/passed/:petId desfaz pass', async () => {
    if (!accessToken || !petIdPassed) return;
    await getAgent(app)
      .delete(`/v1/swipes/passed/${petIdPassed}`)
      .set(authHeaders(accessToken))
      .expect(200);
  });
});
