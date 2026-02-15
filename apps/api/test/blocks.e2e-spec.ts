/**
 * E2E: Bloqueios – bloquear e desbloquear usuário.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Blocks (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  let otherUserId: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
    if (accessToken) {
      const meRes = await getAgent(app).get('/v1/me').set(authHeaders(accessToken));
      let myId: string | null = null;
      if (meRes.status === 200) {
        const meBody = responseBody<{ id: string }>(meRes);
        myId = meBody.id;
      }
      const feedRes = await getAgent(app).get('/v1/feed').set(authHeaders(accessToken));
      if (feedRes.status === 200 && myId) {
        const feedBody = responseBody<{ items: { ownerId?: string }[] }>(feedRes);
        const other = feedBody.items?.find((p) => p.ownerId && p.ownerId !== myId);
        if (other?.ownerId) otherUserId = other.ownerId;
      }
    }
  }, 30000);

  afterAll(async () => {
    if (accessToken && otherUserId) {
      await getAgent(app)
        .delete(`/v1/blocks/${otherUserId}`)
        .set(authHeaders(accessToken))
        .catch(() => {});
    }
    await app.close();
  });

  it('POST /v1/blocks sem token retorna 401', async () => {
    await getAgent(app)
      .post('/v1/blocks')
      .send({ blockedUserId: '00000000-0000-0000-0000-000000000001' })
      .expect(401);
  });

  it('POST /v1/blocks bloqueia outro usuário', async () => {
    if (!accessToken || !otherUserId) return;
    const res = await getAgent(app)
      .post('/v1/blocks')
      .set(authHeaders(accessToken))
      .send({ blockedUserId: otherUserId })
      .expect(201);
    const body = responseBody(res);
    expect(body).toHaveProperty('blocked', true);
  });

  it('DELETE /v1/blocks/:blockedUserId desbloqueia', async () => {
    if (!accessToken || !otherUserId) return;
    const res = await getAgent(app)
      .delete(`/v1/blocks/${otherUserId}`)
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('unblocked', true);
  });
});
