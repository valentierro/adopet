/**
 * E2E: Buscas salvas – criar, listar, atualizar, remover.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('SavedSearch (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  let savedSearchId: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
  }, 30000);

  afterAll(async () => {
    if (accessToken && savedSearchId) {
      await getAgent(app)
        .delete(`/v1/saved-search/${savedSearchId}`)
        .set(authHeaders(accessToken))
        .catch(() => {});
    }
    await app.close();
  });

  it('GET /v1/saved-search sem token retorna 401', async () => {
    await getAgent(app).get('/v1/saved-search').expect(401);
  });

  it('GET /v1/saved-search com token retorna array', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/saved-search')
      .set(authHeaders(accessToken))
      .expect(200);
    expect(Array.isArray(responseBody(res))).toBe(true);
  });

  it('POST /v1/saved-search cria busca salva', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .post('/v1/saved-search')
      .set(authHeaders(accessToken))
      .send({ species: 'DOG', radiusKm: 30 })
      .expect(201);
    const body = responseBody<{ id: string }>(res);
    expect(body).toHaveProperty('id');
    savedSearchId = body.id;
  });

  it('PATCH /v1/saved-search/:id atualiza busca salva', async () => {
    if (!accessToken || !savedSearchId) return;
    const res = await getAgent(app)
      .patch(`/v1/saved-search/${savedSearchId}`)
      .set(authHeaders(accessToken))
      .send({ species: 'CAT', radiusKm: 50 })
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('species', 'CAT');
  });

  it('DELETE /v1/saved-search/:id remove busca salva', async () => {
    if (!accessToken || !savedSearchId) return;
    await getAgent(app)
      .delete(`/v1/saved-search/${savedSearchId}`)
      .set(authHeaders(accessToken))
      .expect(200);
    savedSearchId = null;
  });
});
