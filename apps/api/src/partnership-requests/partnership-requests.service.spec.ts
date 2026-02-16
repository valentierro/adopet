import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from '../partners/partners.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { PartnershipRequestsService } from './partnership-requests.service';

describe('PartnershipRequestsService', () => {
  let service: PartnershipRequestsService;
  let prisma: { partnershipRequest: { findUnique: jest.Mock; update: jest.Mock } };
  let partnersService: jest.Mocked<Pick<PartnersService, 'create'>>;
  let authService: jest.Mocked<Pick<AuthService, 'createUserForOngAdmin'>>;
  let emailService: { isConfigured: jest.Mock; sendMail: jest.Mock };

  const mockRequest = {
    id: 'req-1',
    tipo: 'ong',
    nome: 'João',
    email: 'ong@test.com',
    instituicao: 'ONG Test',
    telefone: '11999999999',
    mensagem: null,
    status: 'PENDING',
    endereco: 'Rua X',
  };

  beforeEach(async () => {
    const findUnique = jest.fn().mockResolvedValue(mockRequest);
    const update = jest.fn().mockResolvedValue({});
    prisma = {
      partnershipRequest: {
        findUnique: findUnique as any,
        update: update as any,
      } as any,
    };
    partnersService = {
      create: jest.fn().mockResolvedValue({ id: 'partner-1', name: 'ONG Test', type: 'ONG' }),
    };
    authService = {
      createUserForOngAdmin: jest.fn().mockResolvedValue({ userId: 'user-1', setPasswordToken: 'token-xyz' }),
    };
    emailService = {
      isConfigured: jest.fn().mockReturnValue(false),
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnershipRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PartnersService, useValue: partnersService },
        { provide: AuthService, useValue: authService },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      ],
    }).compile();

    service = module.get(PartnershipRequestsService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('approve', () => {
    it('lança NotFoundException quando solicitação não existe', async () => {
      prisma.partnershipRequest.findUnique.mockResolvedValue(null);
      await expect(service.approve('inexistente')).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException quando solicitação já foi processada', async () => {
      prisma.partnershipRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      });
      await expect(service.approve('req-1')).rejects.toThrow(BadRequestException);
    });

    it('para ONG chama createUserForOngAdmin e create partner com userId', async () => {
      const result = await service.approve('req-1');
      expect(authService.createUserForOngAdmin).toHaveBeenCalledWith('ong@test.com', 'João', '11999999999');
      expect(partnersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ONG',
          name: 'ONG Test',
          email: 'ong@test.com',
          approve: true,
          userId: 'user-1',
        }),
      );
      expect(result).toEqual({ partnerId: 'partner-1' });
    });

    it('para tipo comercial (store) não chama createUserForOngAdmin', async () => {
      prisma.partnershipRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        tipo: 'comercial',
      });
      partnersService.create.mockResolvedValue({ id: 'partner-2' } as any);
      await service.approve('req-1');
      expect(authService.createUserForOngAdmin).not.toHaveBeenCalled();
      expect(partnersService.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ userId: expect.anything() }),
      );
    });
  });
});
