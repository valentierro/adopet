/**
 * E2E: Listagem pública de parceiros, detalhes, serviços e cupons (sem auth).
 */
import { createApp, getAgent, responseBody } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Partners Public (e2e)', () => {
  let app: INestApplication;
  let firstPartnerId: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    const res = await getAgent(app).get('/v1/partners');
    if (res.status === 200) {
      const list = responseBody<{ id: string }[]>(res);
      firstPartnerId = list?.[0]?.id ?? null;
    }
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/partners retorna lista de parceiros (público)', async () => {
    const res = await getAgent(app).get('/v1/partners').expect(200);
    const body = responseBody(res);
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /v1/partners?type=ONG filtra por tipo', async () => {
    const res = await getAgent(app).get('/v1/partners?type=ONG').expect(200);
    expect(Array.isArray(responseBody(res))).toBe(true);
  });

  it('GET /v1/partners/:id retorna um parceiro (público)', async () => {
    if (!firstPartnerId) return;
    const res = await getAgent(app).get(`/v1/partners/${firstPartnerId}`).expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('id', firstPartnerId);
    expect(body).toHaveProperty('name');
  });

  it('GET /v1/partners/:id/services retorna serviços do parceiro (público)', async () => {
    if (!firstPartnerId) return;
    const res = await getAgent(app).get(`/v1/partners/${firstPartnerId}/services`).expect(200);
    expect(Array.isArray(responseBody(res))).toBe(true);
  });

  it('GET /v1/partners/:id/coupons retorna cupons do parceiro (público)', async () => {
    if (!firstPartnerId) return;
    const res = await getAgent(app).get(`/v1/partners/${firstPartnerId}/coupons`).expect(200);
    expect(Array.isArray(responseBody(res))).toBe(true);
  });

  it('POST /v1/partners/:id/view registra visualização (público)', async () => {
    if (!firstPartnerId) return;
    const res = await getAgent(app).post(`/v1/partners/${firstPartnerId}/view`).expect(201);
    const body = responseBody(res);
    expect(body).toHaveProperty('ok', true);
  });
});
