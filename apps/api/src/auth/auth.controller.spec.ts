import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/** Valores tipo produção usados nos testes */
const PROD_LIKE = {
  email: 'usuario@adopet.com.br',
  password: 'Senha123',
  name: 'João Santos',
  phone: '11987654321',
  username: 'joao.santos',
} as const;

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    signup: jest.Mock;
    forgotPassword: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      signup: jest.fn(),
      forgotPassword: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('deve chamar AuthService.login com body e retornar tokens', async () => {
      const body = { email: PROD_LIKE.email, password: PROD_LIKE.password };
      authService.login.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
      });
      const res = await controller.login(body);
      expect(authService.login).toHaveBeenCalledWith(body);
      expect(res).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
      });
    });
  });

  describe('signup', () => {
    it('deve chamar AuthService.signup e retornar tokens quando serviço retorna AuthResponseDto', async () => {
      const body = {
        email: PROD_LIKE.email,
        password: PROD_LIKE.password,
        name: PROD_LIKE.name,
        phone: PROD_LIKE.phone,
        username: PROD_LIKE.username,
      };
      authService.signup.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 900,
      });
      const res = await controller.signup(body);
      expect(authService.signup).toHaveBeenCalledWith(body);
      expect(res).toHaveProperty('accessToken', 'at');
    });

    it('deve retornar message e requiresEmailVerification quando serviço pede confirmação de e-mail', async () => {
      authService.signup.mockResolvedValue({
        message: 'Enviamos um e-mail de confirmação.',
        requiresEmailVerification: true,
      });
      const res = await controller.signup({
        email: PROD_LIKE.email,
        password: PROD_LIKE.password,
        name: PROD_LIKE.name,
        phone: PROD_LIKE.phone,
        username: PROD_LIKE.username,
      });
      expect(res).toHaveProperty('message');
      expect((res as { requiresEmailVerification?: boolean }).requiresEmailVerification).toBe(true);
    });
  });

  describe('forgotPassword', () => {
    it('deve chamar AuthService.forgotPassword e retornar message', async () => {
      authService.forgotPassword.mockResolvedValue({
        message: 'Se esse e-mail estiver cadastrado, você receberá um link.',
      });
      const res = await controller.forgotPassword({ email: PROD_LIKE.email });
      expect(authService.forgotPassword).toHaveBeenCalledWith({ email: PROD_LIKE.email });
      expect(res.message).toContain('e-mail');
    });
  });
});
