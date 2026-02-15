/**
 * E2E: Cadastro de parceiro (partner-signup).
 */
import { createApp, getAgent, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

const unique = () => `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
/** Telefone único por execução (11 dígitos) para evitar 409 em DB com seed ou runs anteriores. */
const uniquePhone = () => '11' + String(Date.now()).slice(-9);

describe('Auth Partner (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/auth/partner-signup cria conta e estabelecimento', async () => {
    const email = `${unique()}@adopet-e2e.test`;
    const username = unique().replace(/[^a-z0-9._]/g, '');
    const res = await getAgent(app)
      .post('/v1/auth/partner-signup')
      .send({
        email,
        password: 'Senha123',
        name: 'Parceiro E2E',
        phone: uniquePhone(),
        username: username.slice(0, 30),
        establishmentName: 'Estabelecimento E2E Test',
      })
      .expect(201);
    const body = responseBody(res);
    // Com verificação de e-mail ativa, a API pode retornar requiresEmailVerification em vez de tokens
    expect(
      (body as { accessToken?: string }).accessToken !== undefined ||
        (body as { requiresEmailVerification?: boolean }).requiresEmailVerification === true,
    ).toBe(true);
    if ((body as { accessToken?: string }).accessToken) {
      expect(body).toHaveProperty('refreshToken');
    }
  });

  it('POST /v1/auth/partner-signup com email duplicado retorna erro', async () => {
    const email = 'parceiro@adopet.com.br';
    const res = await getAgent(app)
      .post('/v1/auth/partner-signup')
      .send({
        email,
        password: 'admin123',
        name: 'Parceiro Existente',
        phone: '11987654321',
        username: 'parceiroexistente',
        establishmentName: 'Parceiro Seed',
      });
    expect([400, 409]).toContain(res.status);
  });
});
