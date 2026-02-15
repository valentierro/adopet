/**
 * E2E: Login, signup, refresh e logout.
 * Requer banco com usuário (ex.: rodar seed antes: pnpm prisma:seed).
 * Usuário de teste: use variáveis E2E_TEST_EMAIL e E2E_TEST_PASSWORD ou o padrão do seed.
 */
import { createApp } from '../src/app-bootstrap';
import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'admin@adopet.com.br';
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'admin123';

const unique = () => `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
const uniquePhone = () => '11' + String(Date.now()).slice(-9);

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/auth/login com credenciais inválidas retorna 401', async () => {
    const agent = request(app.getHttpServer()) as request.SuperTest<request.Test>;
    await agent
      .post('/v1/auth/login')
      .send({ email: 'invalido@test.com', password: 'wrong12' })
      .expect(401);
  });

  it('POST /v1/auth/login com credenciais válidas retorna 200 e accessToken', async () => {
    const agent = request(app.getHttpServer()) as request.SuperTest<request.Test>;
    const res = await agent
      .post('/v1/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);
    const body = (res as unknown as { body: Record<string, unknown> }).body;
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(typeof body.accessToken).toBe('string');
  });

  it('POST /v1/auth/signup cria conta (tutor) e retorna tokens ou requiresEmailVerification', async () => {
    const agent = request(app.getHttpServer()) as request.SuperTest<request.Test>;
    const email = `${unique()}@adopet-e2e.test`;
    const username = unique().replace(/[^a-z0-9._]/g, '').slice(0, 30);
    const res = await agent
      .post('/v1/auth/signup')
      .send({
        email,
        password: 'Senha123',
        name: 'Tutor E2E',
        phone: uniquePhone(),
        username,
      })
      .expect(201);
    const body = (res as unknown as { body: Record<string, unknown> }).body;
    const hasTokens = typeof body.accessToken === 'string';
    const hasVerification = body.requiresEmailVerification === true;
    expect(hasTokens || hasVerification).toBe(true);
    if (hasTokens) {
      expect(body).toHaveProperty('refreshToken');
    }
  });

  it('POST /v1/auth/signup com email duplicado retorna 409', async () => {
    const agent = request(app.getHttpServer()) as request.SuperTest<request.Test>;
    const res = await agent.post('/v1/auth/signup').send({
      email: E2E_TEST_EMAIL,
      password: 'admin123',
      name: 'Duplicado',
      phone: '11987654320',
      username: 'duplicadoe2e',
    });
    expect(res.status).toBe(409);
  });

  it('POST /v1/auth/refresh com refreshToken válido retorna 200 e novos tokens', async () => {
    const agent = request(app.getHttpServer()) as request.SuperTest<request.Test>;
    const loginRes = await agent
      .post('/v1/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD });
    const loginBody = (loginRes as unknown as { body: { refreshToken?: string } }).body;
    const refreshToken = loginBody.refreshToken;
    if (!refreshToken) return;
    const res = await agent
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    const body = (res as unknown as { body: Record<string, unknown> }).body;
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
  });

  it('POST /v1/auth/logout com refreshToken retorna 200', async () => {
    const agent = request(app.getHttpServer()) as request.SuperTest<request.Test>;
    const loginRes = await agent
      .post('/v1/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD });
    const loginBody = (loginRes as unknown as { body: { refreshToken?: string } }).body;
    const refreshToken = loginBody.refreshToken;
    if (!refreshToken) return;
    await agent.post('/v1/auth/logout').send({ refreshToken }).expect(200);
  });
});
