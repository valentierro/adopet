/**
 * E2E: Me – perfil, estatísticas do tutor, preferências.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Me (e2e)', () => {
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

  it('GET /v1/me sem token retorna 401', async () => {
    await getAgent(app).get('/v1/me').expect(401);
  });

  it('GET /v1/me com token retorna dados do usuário', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/me')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('email');
  });

  it('GET /v1/me/tutor-stats retorna pontuação e nível', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/me/tutor-stats')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('level');
    expect(body).toHaveProperty('points');
  });

  it('GET /v1/me/preferences retorna preferências', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/me/preferences')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('species');
    expect(body).toHaveProperty('radiusKm');
  });

  it('PUT /v1/me/preferences atualiza preferências', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .put('/v1/me/preferences')
      .set(authHeaders(accessToken))
      .send({ species: 'BOTH', radiusKm: 50 })
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('species');
  });
});
