/**
 * E2E: CRUD de anúncios (pets), detalhes de pet, perfil público do tutor.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Pets (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  let createdPetId: string;
  let firstPetIdFromFeed: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
    if (accessToken) {
      const feedRes = await getAgent(app)
        .get('/v1/feed')
        .set(authHeaders(accessToken));
      if (feedRes.status === 200) {
        const feedBody = responseBody<{ items: { id: string }[] }>(feedRes);
        firstPetIdFromFeed = feedBody.items?.[0]?.id ?? null;
      }
    }
  }, 30000);

  afterAll(async () => {
    if (accessToken && createdPetId) {
      await getAgent(app)
        .delete(`/v1/pets/${createdPetId}`)
        .set(authHeaders(accessToken))
        .catch(() => {});
    }
    await app.close();
  });

  it('GET /v1/pets/:id sem auth retorna 200 (público)', async () => {
    if (!firstPetIdFromFeed) return;
    const res = await getAgent(app).get(`/v1/pets/${firstPetIdFromFeed}`).expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('id', firstPetIdFromFeed);
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('species');
    expect(body).toHaveProperty('description');
  });

  it('GET /v1/pets/:petId/owner-profile retorna 200 (perfil tutor, público)', async () => {
    if (!firstPetIdFromFeed) return;
    const res = await getAgent(app)
      .get(`/v1/pets/${firstPetIdFromFeed}/owner-profile`)
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('name');
    expect(body).not.toHaveProperty('phone');
  });

  it('GET /v1/pets/mine sem token retorna 401', async () => {
    await getAgent(app).get('/v1/pets/mine').expect(401);
  });

  it('GET /v1/pets/mine com token retorna 200 e items', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/pets/mine')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody<{ items: unknown[]; nextCursor: string | null }>(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('POST /v1/pets cria anúncio e retorna 201', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .post('/v1/pets')
      .set(authHeaders(accessToken))
      .send({
        name: 'Pet E2E Test',
        species: 'dog',
        age: 2,
        sex: 'male',
        size: 'medium',
        vaccinated: true,
        neutered: false,
        description: 'Descrição com mais de dez caracteres para validação.',
      })
      .expect(201);
    const body = responseBody<{ id: string }>(res);
    expect(body).toHaveProperty('id');
    createdPetId = body.id;
  });

  it('PUT /v1/pets/:id atualiza anúncio (dono)', async () => {
    if (!accessToken || !createdPetId) return;
    const res = await getAgent(app)
      .put(`/v1/pets/${createdPetId}`)
      .set(authHeaders(accessToken))
      .send({ description: 'Descrição atualizada para teste E2E.' })
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('description', 'Descrição atualizada para teste E2E.');
  });

  it('GET /v1/pets/:id/similar retorna 200 e array', async () => {
    if (!firstPetIdFromFeed) return;
    const res = await getAgent(app)
      .get(`/v1/pets/${firstPetIdFromFeed}/similar`)
      .expect(200);
    const body = responseBody(res);
    expect(Array.isArray(body)).toBe(true);
  });
});
