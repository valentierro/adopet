import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { SignupDto } from './signup.dto';

/**
 * Testa que os DTOs de auth aplicam Transform (trim + lowercase no e-mail)
 * como em produção, evitando 400 por espaços ou maiúsculas.
 */
describe('Auth DTOs transform (valores tipo produção)', () => {
  describe('LoginDto', () => {
    it('deve normalizar e-mail (trim + lowercase) quando transform é aplicado', async () => {
      const plain = { email: '  Usuario@Adopet.com.BR  ', password: 'Senha123' };
      const dto = plainToClass(LoginDto, plain, { enableImplicitConversion: true });
      expect(dto.email).toBe('usuario@adopet.com.br');
      expect(dto.password).toBe('Senha123');
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve aceitar e-mail e senha válidos (formato produção)', async () => {
      const plain = { email: 'maria.silva@email.com.br', password: 'MinhaSenha123' };
      const dto = plainToClass(LoginDto, plain, { enableImplicitConversion: true });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar senha com menos de 6 caracteres', async () => {
      const plain = { email: 'user@email.com', password: '12345' };
      const dto = plainToClass(LoginDto, plain, { enableImplicitConversion: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });
  });

  describe('ForgotPasswordDto', () => {
    it('deve normalizar e-mail (trim + lowercase)', async () => {
      const plain = { email: '  Recuperar@Email.COM  ' };
      const dto = plainToClass(ForgotPasswordDto, plain, { enableImplicitConversion: true });
      expect(dto.email).toBe('recuperar@email.com');
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('SignupDto', () => {
    it('deve normalizar e-mail (trim + lowercase) e aceitar payload tipo produção', async () => {
      const plain = {
        email: '  Novo.Usuario@Dominio.com.br  ',
        password: 'SenhaSegura123',
        name: 'Maria Silva',
        phone: '11987654321',
        username: 'maria.silva',
      };
      const dto = plainToClass(SignupDto, plain, { enableImplicitConversion: true });
      expect(dto.email).toBe('novo.usuario@dominio.com.br');
      expect(dto.username).toBe('maria.silva');
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar telefone com menos de 10 dígitos', async () => {
      const plain = {
        email: 'user@email.com',
        password: 'Senha123',
        name: 'João',
        phone: '123456789',
        username: 'joao',
      };
      const dto = plainToClass(SignupDto, plain, { enableImplicitConversion: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'phone')).toBe(true);
    });
  });
});
