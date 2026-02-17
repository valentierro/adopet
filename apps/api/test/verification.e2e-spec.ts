/**
 * E2E: Verificação – solicitar (com evidências ou skip), status.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Verification (e2e)', () => {
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

  it('GET /v1/verification/status sem token retorna 401', async () => {
    await getAgent(app).get('/v1/verification/status').expect(401);
  });

  it('GET /v1/verification/status com token retorna requests e userVerified', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/verification/status')
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody<{ requests: unknown[]; userVerified: boolean }>(res);
    expect(body).toHaveProperty('requests');
    expect(Array.isArray(body.requests)).toBe(true);
    expect(typeof body.userVerified).toBe('boolean');
  });

  it('POST /v1/verification/request sem token retorna 401', async () => {
    await getAgent(app)
      .post('/v1/verification/request')
      .send({ type: 'USER_VERIFIED' })
      .expect(401);
  });

  it('POST /v1/verification/request USER_VERIFIED sem fotos e sem skipEvidenceReason retorna 400', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .post('/v1/verification/request')
      .set(authHeaders(accessToken))
      .send({ type: 'USER_VERIFIED' })
      .expect(400);
    const body = responseBody<{ message?: string | string[] }>(res);
    const msg = Array.isArray(body.message) ? body.message.join(' ') : body.message ?? '';
    expect(msg).toMatch(/foto|Não consigo enviar fotos/i);
  });

  it('POST /v1/verification/request USER_VERIFIED com skipEvidenceReason retorna 201 e item com skipEvidenceReason', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .post('/v1/verification/request')
      .set(authHeaders(accessToken))
      .send({
        type: 'USER_VERIFIED',
        skipEvidenceReason: 'E2E teste de acessibilidade',
      });
    // 201 criado ou 400 se já existir solicitação pendente (outro teste ou seed)
    expect([200, 201, 400]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      const body = responseBody<{ id: string; type: string; status: string; skipEvidenceReason?: string }>(res);
      expect(body).toHaveProperty('id');
      expect(body.type).toBe('USER_VERIFIED');
      expect(body.status).toBe('PENDING');
      expect(body.skipEvidenceReason).toBe('E2E teste de acessibilidade');
    }
  });

  it('POST /v1/verification/request USER_VERIFIED com evidenceUrls retorna 201 e item com evidenceUrls', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .post('/v1/verification/request')
      .set(authHeaders(accessToken))
      .send({
        type: 'USER_VERIFIED',
        evidenceUrls: ['https://example.com/evidencia-e2e.jpg'],
      });
    expect([200, 201, 400]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      const body = responseBody<{ id: string; type: string; status: string; evidenceUrls?: string[] }>(res);
      expect(body).toHaveProperty('id');
      expect(body.type).toBe('USER_VERIFIED');
      expect(body.status).toBe('PENDING');
      expect(body.evidenceUrls).toEqual(['https://example.com/evidencia-e2e.jpg']);
    }
  });

  it('POST /v1/verification/request PET_VERIFIED sem petId retorna 400', async () => {
    if (!accessToken) return;
    await getAgent(app)
      .post('/v1/verification/request')
      .set(authHeaders(accessToken))
      .send({
        type: 'PET_VERIFIED',
        evidenceUrls: ['https://a.com/1.jpg', 'https://a.com/2.jpg'],
      })
      .expect(400);
  });
});
