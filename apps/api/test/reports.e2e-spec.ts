/**
 * E2E: Denúncias – criar denúncia (pet/usuário/mensagem). Listar/resolver exige admin.
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  let petIdForReport: string | null;
  let reportId: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
    if (accessToken) {
      const feedRes = await getAgent(app).get('/v1/feed').set(authHeaders(accessToken));
      if (feedRes.status === 200) {
        const body = responseBody<{ items: { id: string }[] }>(feedRes);
        petIdForReport = body.items?.[0]?.id ?? null;
      }
    }
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/reports sem token retorna 401', async () => {
    if (!petIdForReport) return;
    await getAgent(app)
      .post('/v1/reports')
      .send({
        targetType: 'PET',
        targetId: petIdForReport,
        reason: 'Conteúdo inadequado',
      })
      .expect(401);
  });

  it('POST /v1/reports cria denúncia de pet', async () => {
    if (!accessToken || !petIdForReport) return;
    const res = await getAgent(app)
      .post('/v1/reports')
      .set(authHeaders(accessToken))
      .send({
        targetType: 'PET',
        targetId: petIdForReport,
        reason: 'Conteúdo inadequado E2E',
        description: 'Teste E2E de denúncia.',
      })
      .expect(201);
    const body = responseBody<{ id: string }>(res);
    expect(body).toHaveProperty('id');
    reportId = body.id;
  });
});
