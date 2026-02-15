/**
 * E2E: CRUD de serviços do parceiro (me/partner/services).
 * Usa usuário parceiro do seed: E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD ou parceiro@adopet.com.br / admin123.
 */
import { createApp, getAgent, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

const E2E_PARTNER_EMAIL = process.env.E2E_PARTNER_EMAIL ?? 'parceiro@adopet.com.br';
const E2E_PARTNER_PASSWORD = process.env.E2E_PARTNER_PASSWORD ?? 'admin123';

describe('Partner Services (e2e)', () => {
  let app: INestApplication;
  let partnerToken: string | null;
  let createdServiceId: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    const loginRes = await getAgent(app)
      .post('/v1/auth/login')
      .send({ email: E2E_PARTNER_EMAIL, password: E2E_PARTNER_PASSWORD });
    const body = (loginRes as unknown as { body?: { accessToken?: string } }).body;
    partnerToken = body?.accessToken ?? null;
  }, 30000);

  afterAll(async () => {
    if (partnerToken && createdServiceId) {
      await getAgent(app)
        .delete(`/v1/me/partner/services/${createdServiceId}`)
        .set(authHeaders(partnerToken))
        .catch(() => {});
    }
    await app.close();
  });

  it('GET /v1/me/partner sem token retorna 401', async () => {
    await getAgent(app).get('/v1/me/partner').expect(401);
  });

  it('GET /v1/me/partner com token parceiro retorna dados do estabelecimento', async () => {
    if (!partnerToken) return;
    const res = await getAgent(app)
      .get('/v1/me/partner')
      .set(authHeaders(partnerToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('name');
  });

  it('GET /v1/me/partner/services retorna lista (pode ser vazia)', async () => {
    if (!partnerToken) return;
    const res = await getAgent(app)
      .get('/v1/me/partner/services')
      .set(authHeaders(partnerToken))
      .expect(200);
    expect(Array.isArray(responseBody(res))).toBe(true);
  });

  it('POST /v1/me/partner/services cria serviço', async () => {
    if (!partnerToken) return;
    const res = await getAgent(app)
      .post('/v1/me/partner/services')
      .set(authHeaders(partnerToken))
      .send({
        name: 'Banho e tosa E2E',
        description: 'Serviço criado por teste E2E',
        priceDisplay: 'A partir de R$ 50',
      })
      .expect(201);
    const body = responseBody<{ id: string }>(res);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name', 'Banho e tosa E2E');
    createdServiceId = body.id;
  });

  it('PUT /v1/me/partner/services/:id atualiza serviço', async () => {
    if (!partnerToken || !createdServiceId) return;
    const res = await getAgent(app)
      .put(`/v1/me/partner/services/${createdServiceId}`)
      .set(authHeaders(partnerToken))
      .send({ name: 'Banho e tosa atualizado E2E', description: 'Descrição atualizada' })
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('name', 'Banho e tosa atualizado E2E');
  });

  it('DELETE /v1/me/partner/services/:id remove serviço', async () => {
    if (!partnerToken || !createdServiceId) return;
    await getAgent(app)
      .delete(`/v1/me/partner/services/${createdServiceId}`)
      .set(authHeaders(partnerToken))
      .expect(200);
    createdServiceId = null;
  });
});
