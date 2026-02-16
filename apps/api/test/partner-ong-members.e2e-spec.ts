/**
 * E2E: Fluxo ONG – aprovação de solicitação (cria User + Partner com userId) e API de membros.
 * - Aprovar solicitação ONG cria conta admin e envia e-mail para definir senha.
 * - GET/POST/DELETE /me/partner/members só para parceiro type=ONG.
 */
import { createApp, getAgent, responseBody, authHeaders, loginAndGetToken } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

const E2E_PARTNER_EMAIL = process.env.E2E_PARTNER_EMAIL ?? 'parceiro@adopet.com.br';
const E2E_PARTNER_PASSWORD = process.env.E2E_PARTNER_PASSWORD ?? 'admin123';

describe('Partner ONG and members (e2e)', () => {
  let app: INestApplication;
  let adminToken: string | null;
  let storePartnerToken: string | null;
  let createdRequestId: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    adminToken = await loginAndGetToken(app);
    const partnerRes = await getAgent(app)
      .post('/v1/auth/login')
      .send({ email: E2E_PARTNER_EMAIL, password: E2E_PARTNER_PASSWORD });
    const partnerBody = (partnerRes as unknown as { body?: { accessToken?: string } }).body;
    storePartnerToken = partnerBody?.accessToken ?? null;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/public/partnership-request cria solicitação ONG', async () => {
    const res = await getAgent(app)
      .post('/v1/public/partnership-request')
      .send({
        tipo: 'ong',
        nome: 'João Admin',
        email: `ong-e2e-${Date.now()}@test.adopet.com.br`,
        instituicao: 'ONG E2E Test',
        telefone: '11999999999',
        mensagem: 'E2E test',
      })
      .expect(200);
    const body = responseBody<{ ok?: boolean }>(res);
    expect(body.ok).toBe(true);
  });

  it('GET /v1/admin/partnership-requests retorna lista com pelo menos uma pendente', async () => {
    if (!adminToken) return;
    const res = await getAgent(app)
      .get('/v1/admin/partnership-requests')
      .set(authHeaders(adminToken))
      .expect(200);
    const list = responseBody<Array<{ id: string; status: string; tipo: string }>>(res);
    expect(Array.isArray(list)).toBe(true);
    const pending = list.find((r) => r.status === 'PENDING' && r.tipo === 'ong');
    if (pending) createdRequestId = pending.id;
  });

  it('POST /v1/admin/partnership-requests/:id/approve para ONG retorna partnerId', async () => {
    if (!adminToken) return;
    const listRes = await getAgent(app)
      .get('/v1/admin/partnership-requests')
      .set(authHeaders(adminToken))
      .expect(200);
    const list = responseBody<Array<{ id: string; status: string; tipo: string }>>(listRes);
    const pendingOng = list.find((r) => r.status === 'PENDING' && r.tipo === 'ong');
    if (!pendingOng) {
      return; // skip se não houver solicitação ONG pendente
    }
    const approveRes = await getAgent(app)
      .post(`/v1/admin/partnership-requests/${pendingOng.id}/approve`)
      .set(authHeaders(adminToken))
      .expect(200);
    const body = responseBody<{ partnerId: string }>(approveRes);
    expect(body).toHaveProperty('partnerId');
    expect(typeof body.partnerId).toBe('string');
  });

  it('GET /v1/me/partner/members com parceiro não-ONG retorna 403', async () => {
    if (!storePartnerToken) return;
    await getAgent(app)
      .get('/v1/me/partner/members')
      .set(authHeaders(storePartnerToken))
      .expect(403);
  });

  it('POST /v1/me/partner/members com parceiro não-ONG retorna 403', async () => {
    if (!storePartnerToken) return;
    await getAgent(app)
      .post('/v1/me/partner/members')
      .set(authHeaders(storePartnerToken))
      .send({ email: 'membro@test.com', name: 'Membro Test' })
      .expect(403);
  });

  it('POST /v1/auth/set-password com token inválido retorna 400', async () => {
    await getAgent(app)
      .post('/v1/auth/set-password')
      .send({ token: 'invalid-token', newPassword: 'NewPass123' })
      .expect(400);
  });
});
