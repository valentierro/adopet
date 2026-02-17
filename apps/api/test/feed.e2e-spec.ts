/**
 * E2E: Feed e mapa (exige autenticação).
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Feed (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  /** Pet criado pelo usuário do token, aprovado para o feed (para testar visibilidade no próprio feed). */
  let ownApprovedPetId: string | null = null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
  }, 30000);

  afterAll(async () => {
    if (accessToken && ownApprovedPetId) {
      await getAgent(app)
        .delete(`/v1/pets/${ownApprovedPetId}`)
        .set(authHeaders(accessToken))
        .catch(() => {});
    }
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

  it('pets cadastrados e aprovados pelo usuário aparecem no feed para ele mesmo', async () => {
    if (!accessToken) return;
    const agent = getAgent(app).set(authHeaders(accessToken));

    // 1) Criar pet (publicationStatus PENDING)
    const createRes = await agent
      .post('/v1/pets')
      .send({
        name: 'Feed E2E Own Pet',
        species: 'dog',
        age: 1,
        sex: 'female',
        size: 'small',
        vaccinated: true,
        neutered: false,
        description: 'Pet para confirmar que aparece no feed do próprio usuário.',
      })
      .expect(201);
    const created = responseBody<{ id: string }>(createRes);
    ownApprovedPetId = created.id;

    // 2) Aprovar publicação (admin) para o pet entrar no feed
    const patchRes = await agent
      .patch(`/v1/pets/${ownApprovedPetId}/publication`)
      .send({ status: 'APPROVED' });
    if (patchRes.status === 403) {
      // Test user não é admin: pular teste (ambiente sem ADMIN_USER_IDS para esse user)
      return;
    }
    expect([200, 404]).toContain(patchRes.status);
    if (patchRes.status === 404) return;

    // 3) Buscar feed e garantir que o próprio pet está nos items
    const feedRes = await agent.get('/v1/feed').expect(200);
    const feedBody = responseBody<{ items: { id: string }[] }>(feedRes);
    const ids = (feedBody.items ?? []).map((i) => i.id);
    expect(ids).toContain(ownApprovedPetId);
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
