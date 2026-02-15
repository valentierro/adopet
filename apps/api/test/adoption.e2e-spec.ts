/**
 * E2E: Fluxo de adoção – minhas adoções, pendências de confirmação, confirmar adoção.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Adoption (e2e)', () => {
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

  it('GET /v1/me/adoptions sem token retorna 401', async () => {
    await getAgent(app).get('/v1/me/adoptions').expect(401);
  });

  it('GET /v1/me/adoptions com token retorna 200 e estrutura de adoções', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/me/adoptions')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('GET /v1/me/pending-adoption-confirmations com token retorna 200', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/me/pending-adoption-confirmations')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('POST /v1/pets/:id/confirm-adoption sem ser adotante indicado retorna 403 ou 400', async () => {
    if (!accessToken) return;
    const feedRes = await getAgent(app).get('/v1/feed').set(authHeaders(accessToken));
    if (feedRes.status !== 200) return;
    const feedBody = responseBody<{ items: { id: string }[] }>(feedRes);
    const anyPetId = feedBody.items?.[0]?.id;
    if (!anyPetId) return;
    const res = await getAgent(app)
      .post(`/v1/pets/${anyPetId}/confirm-adoption`)
      .set(authHeaders(accessToken));
    expect([400, 403]).toContain(res.status);
  });
});
