import { isSignup409Conflict } from './signupError';

describe('isSignup409Conflict', () => {
  it('retorna true para API 409 com "Email já cadastrado"', () => {
    const msg =
      'API 409: {"message":"Email já cadastrado.","error":"Conflict","statusCode":409}';
    expect(isSignup409Conflict(msg)).toBe(true);
  });

  it('retorna true para API 409 com "Telefone já cadastrado"', () => {
    const msg =
      'API 409: {"message":"Telefone já cadastrado.","error":"Conflict","statusCode":409}';
    expect(isSignup409Conflict(msg)).toBe(true);
  });

  it('retorna true para API 409 com nome de usuário já em uso', () => {
    const msg =
      'API 409: {"message":"Este nome de usuário já está em uso. Escolha outro.","error":"Conflict","statusCode":409}';
    expect(isSignup409Conflict(msg)).toBe(true);
  });

  it('retorna true para mensagem com statusCode 409 e Conflict', () => {
    expect(
      isSignup409Conflict(
        'Error: API 409: {"message":"Email já cadastrado","error":"Conflict","statusCode":409}',
      ),
    ).toBe(true);
  });

  it('retorna false para erro 500', () => {
    expect(
      isSignup409Conflict('API 500: Internal Server Error'),
    ).toBe(false);
  });

  it('retorna false para erro de rede', () => {
    expect(
      isSignup409Conflict('Network request failed'),
    ).toBe(false);
  });

  it('retorna false para 400 Bad Request', () => {
    expect(
      isSignup409Conflict('API 400: Bad Request'),
    ).toBe(false);
  });

  it('retorna false para string vazia', () => {
    expect(isSignup409Conflict('')).toBe(false);
  });
});
