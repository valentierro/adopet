/**
 * E2E: Favoritos – adicionar, listar, remover.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Favorites (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  let petIdToFavorite: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
    if (accessToken) {
      const feedRes = await getAgent(app).get('/v1/feed').set(authHeaders(accessToken));
      if (feedRes.status === 200) {
        const body = responseBody<{ items: { id: string }[] }>(feedRes);
        petIdToFavorite = body.items?.[0]?.id ?? null;
      }
    }
  }, 30000);

  afterAll(async () => {
    if (accessToken && petIdToFavorite) {
      await getAgent(app)
        .delete(`/v1/favorites/${petIdToFavorite}`)
        .set(authHeaders(accessToken))
        .catch(() => {});
    }
    await app.close();
  });

  it('GET /v1/favorites sem token retorna 401', async () => {
    await getAgent(app).get('/v1/favorites').expect(401);
  });

  it('GET /v1/favorites com token retorna 200 e items', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/favorites')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody<{ items: unknown[]; nextCursor: string | null }>(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('POST /v1/favorites adiciona pet aos favoritos', async () => {
    if (!accessToken || !petIdToFavorite) return;
    // Garante estado limpo (idempotente): remove se já estiver nos favoritos
    await getAgent(app)
      .delete(`/v1/favorites/${petIdToFavorite}`)
      .set(authHeaders(accessToken))
      .catch(() => {});
    const res = await getAgent(app)
      .post('/v1/favorites')
      .set(authHeaders(accessToken))
      .send({ petId: petIdToFavorite })
      .expect(201);
    const body = responseBody(res);
    expect(body).toHaveProperty('petId', petIdToFavorite);
  });

  it('DELETE /v1/favorites/:petId remove dos favoritos', async () => {
    if (!accessToken || !petIdToFavorite) return;
    await getAgent(app)
      .delete(`/v1/favorites/${petIdToFavorite}`)
      .set(authHeaders(accessToken))
      .expect(200);
  });
});
