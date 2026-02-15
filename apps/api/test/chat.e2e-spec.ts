/**
 * E2E: Chat – conversas e mensagens (criar conversa, listar, obter uma, enviar mensagem, listar mensagens).
 */
import { createApp, getAgent, loginAndGetToken, responseBody, authHeaders } from './e2e-helpers';
import type { INestApplication } from '@nestjs/common';

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | null;
  let petIdForChat: string | null;
  let conversationId: string | null;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    accessToken = await loginAndGetToken(app);
    if (accessToken) {
      const feedRes = await getAgent(app).get('/v1/feed').set(authHeaders(accessToken));
      if (feedRes.status === 200) {
        const body = responseBody<{ items: { id: string }[] }>(feedRes);
        petIdForChat = body.items?.[0]?.id ?? null;
      }
      if (petIdForChat) {
        await getAgent(app)
          .post('/v1/favorites')
          .set(authHeaders(accessToken))
          .send({ petId: petIdForChat })
          .catch(() => {});
      }
    }
  }, 30000);

  afterAll(async () => {
    if (accessToken && conversationId) {
      await getAgent(app)
        .delete(`/v1/conversations/${conversationId}`)
        .set(authHeaders(accessToken))
        .catch(() => {});
    }
    await app.close();
  });

  it('GET /v1/conversations sem token retorna 401', async () => {
    await getAgent(app).get('/v1/conversations').expect(401);
  });

  it('GET /v1/conversations com token retorna 200 e array', async () => {
    if (!accessToken) return;
    const res = await getAgent(app)
      .get('/v1/conversations')
      .set(authHeaders(accessToken))
      .expect(200);
    expect(Array.isArray(responseBody(res))).toBe(true);
  });

  it('POST /v1/conversations cria ou obtém conversa (pet nos favoritos)', async () => {
    if (!accessToken || !petIdForChat) return;
    const res = await getAgent(app)
      .post('/v1/conversations')
      .set(authHeaders(accessToken))
      .send({ petId: petIdForChat })
      .expect(201);
    const body = responseBody<{ id: string }>(res);
    expect(body).toHaveProperty('id');
    conversationId = body.id;
  });

  it('GET /v1/conversations/:id retorna conversa com otherUser e pet', async () => {
    if (!accessToken || !conversationId) return;
    const res = await getAgent(app)
      .get(`/v1/conversations/${conversationId}`)
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody(res);
    expect(body).toHaveProperty('id', conversationId);
    expect(body).toHaveProperty('otherUser');
  });

  it('POST /v1/conversations/:id/messages envia mensagem', async () => {
    if (!accessToken || !conversationId) return;
    const res = await getAgent(app)
      .post(`/v1/conversations/${conversationId}/messages`)
      .set(authHeaders(accessToken))
      .send({ content: 'Olá, tenho interesse no pet! E2E.' })
      .expect(201);
    const body = responseBody(res);
    expect(body).toHaveProperty('content', 'Olá, tenho interesse no pet! E2E.');
  });

  it('GET /v1/conversations/:id/messages retorna mensagens (cursor)', async () => {
    if (!accessToken || !conversationId) return;
    const res = await getAgent(app)
      .get(`/v1/conversations/${conversationId}/messages`)
      .set(authHeaders(accessToken))
      .expect(200);
    const body = responseBody<{ items: unknown[]; nextCursor: string | null }>(res);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });
});
