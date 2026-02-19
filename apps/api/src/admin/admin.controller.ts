import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminService } from './admin.service';
import { BugReportsService } from '../bug-reports/bug-reports.service';
import { PartnerRecommendationsService } from '../partner-recommendations/partner-recommendations.service';
import { PartnersService } from '../partners/partners.service';
import { PartnershipRequestsService } from '../partnership-requests/partnership-requests.service';
import type { PartnershipRequestAdminDto } from '../partnership-requests/partnership-requests.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { AdoptionItemDto } from './dto/adoption-item.dto';
import { CreateAdoptionDto } from './dto/create-adoption.dto';
import { UserSearchItemDto } from './dto/user-search-item.dto';
import type { AdminUserListResponseDto } from './dto/admin-user-list-item.dto';
import { PetAvailableItemDto } from './dto/pet-available-item.dto';
import { PendingAdoptionByTutorDto } from './dto/pending-adoption-by-tutor.dto';
import type { BugReportResponseDto } from '../bug-reports/dto/bug-report-response.dto';
import type { PartnerAdminDto } from '../partners/dto/partner-response.dto';
import type { PartnerRecommendationResponseDto } from '../partner-recommendations/dto/partner-recommendation-response.dto';
import { CreatePartnerDto } from '../partners/dto/create-partner.dto';
import { UpdatePartnerDto } from '../partners/dto/update-partner.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly bugReportsService: BugReportsService,
    private readonly partnerRecommendationsService: PartnerRecommendationsService,
    private readonly partnersService: PartnersService,
    private readonly partnershipRequestsService: PartnershipRequestsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: '[Admin] Dashboard: totais de adoções, pendentes, etc.' })
  async getStats(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Get('adoptions')
  @ApiOperation({ summary: '[Admin] Listar adoções registradas (tutor + adotante)' })
  async getAdoptions(): Promise<AdoptionItemDto[]> {
    return this.adminService.getAdoptions();
  }

  @Post('adoptions')
  @ApiOperation({ summary: '[Admin] Registrar adoção (pet + adotante); define tutor pelo dono do pet' })
  async createAdoption(@Body() dto: CreateAdoptionDto): Promise<AdoptionItemDto> {
    return this.adminService.createAdoption(dto.petId, dto.adopterUserId, true);
  }

  @Post('adoptions/:petId/confirm-by-adopet')
  @ApiOperation({ summary: '[Admin] Marcar adoção como confirmada pela Adopet (badge "Confirmado pelo Adopet")' })
  async confirmAdoptionByAdopet(@Param('petId') petId: string): Promise<{ message: string }> {
    await this.adminService.confirmAdoptionByAdopet(petId);
    return { message: 'OK' };
  }

  @Post('adoptions/:petId/reject-by-adopet')
  @ApiOperation({ summary: '[Admin] Rejeitar adoção pela Adopet (badge "Rejeitado pelo Adopet" para tutor/adotante)' })
  async rejectAdoptionByAdopet(
    @Param('petId') petId: string,
    @Body() body?: { rejectionReason?: string },
  ): Promise<{ message: string }> {
    await this.adminService.rejectAdoptionByAdopet(petId, body?.rejectionReason);
    return { message: 'OK' };
  }

  @Get('users/list')
  @ApiOperation({ summary: '[Admin] Lista usuários com busca e paginação (seção Usuários; banir sem denúncia)' })
  async getUsersList(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<AdminUserListResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 30)) : 30;
    return this.adminService.getUsersList(search, pageNum, limitNum);
  }

  @Post('users/:userId/ban')
  @ApiOperation({ summary: '[Admin] Banir usuário (sem denúncia). Desativa conta; não permite banir admin.' })
  async banUser(
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
    @Body() body?: { reason?: string },
  ): Promise<{ message: string }> {
    return this.adminService.banUser(userId, user.id, body?.reason);
  }

  @Get('users')
  @ApiOperation({ summary: '[Admin] Buscar usuários por nome ou email (para selecionar adotante)' })
  async searchUsers(@Query('search') search?: string): Promise<UserSearchItemDto[]> {
    return this.adminService.searchUsers(search ?? '');
  }

  @Get('pets-available')
  @ApiOperation({ summary: '[Admin] Listar pets disponíveis para adoção (para registrar adoção)' })
  async getPetsAvailable(): Promise<PetAvailableItemDto[]> {
    return this.adminService.getPetsAvailable();
  }

  @Get('pending-adoptions-by-tutor')
  @ApiOperation({ summary: '[Admin] Pets marcados como adotados pelo tutor (aguardando registro/confirmação)' })
  async getPendingAdoptionsByTutor(): Promise<PendingAdoptionByTutorDto[]> {
    return this.adminService.getPendingAdoptionsByTutor();
  }

  @Post('pending-adoptions-by-tutor/:petId/reject')
  @ApiOperation({ summary: '[Admin] Rejeitar marcação de adoção pelo tutor; pet volta a disponível e não computa pontos' })
  async rejectPendingAdoptionByTutor(
    @Param('petId') petId: string,
    @Body() body?: { rejectionReason?: string },
  ): Promise<{ message: string }> {
    await this.adminService.rejectPendingAdoptionByTutor(petId, body?.rejectionReason);
    return { message: 'OK' };
  }

  @Get('bug-reports')
  @ApiOperation({ summary: '[Admin] Listar reports de bugs enviados pelos usuários (beta)' })
  async getBugReports(): Promise<BugReportResponseDto[]> {
    return this.bugReportsService.findAllForAdmin();
  }

  @Get('partner-recommendations')
  @ApiOperation({ summary: '[Admin] Listar indicações de parceiros (quem indicou + dados do indicado)' })
  async getPartnerRecommendations(): Promise<PartnerRecommendationResponseDto[]> {
    return this.partnerRecommendationsService.findAllForAdmin();
  }

  @Get('partnership-requests')
  @ApiOperation({ summary: '[Admin] Listar solicitações de parceria (formulário do app)' })
  async getPartnershipRequests(): Promise<PartnershipRequestAdminDto[]> {
    return this.partnershipRequestsService.findAllForAdmin();
  }

  @Post('partnership-requests/:id/approve')
  @ApiOperation({ summary: '[Admin] Aprovar solicitação de parceria (cria parceiro e vincula)' })
  async approvePartnershipRequest(@Param('id') id: string): Promise<{ partnerId: string }> {
    return this.partnershipRequestsService.approve(id);
  }

  @Post('partnership-requests/:id/reject')
  @ApiOperation({ summary: '[Admin] Rejeitar solicitação de parceria (motivo opcional)' })
  async rejectPartnershipRequest(
    @Param('id') id: string,
    @Body() body?: { rejectionReason?: string },
  ): Promise<{ message: string }> {
    await this.partnershipRequestsService.reject(id, body?.rejectionReason);
    return { message: 'OK' };
  }

  @Get('partners')
  @ApiOperation({ summary: '[Admin] Listar todos os parceiros (ONG, clínicas, lojas)' })
  async getPartners(): Promise<PartnerAdminDto[]> {
    return this.partnersService.findAllAdmin();
  }

  @Post('partners')
  @ApiOperation({ summary: '[Admin] Cadastrar parceiro' })
  async createPartner(@Body() dto: CreatePartnerDto): Promise<PartnerAdminDto> {
    return this.partnersService.create(dto);
  }

  @Post('partners/bulk-approve')
  @ApiOperation({ summary: '[Admin] Aprovar vários parceiros de uma vez' })
  async bulkApprovePartners(@Body() body: { ids: string[] }): Promise<{ updated: number }> {
    return this.partnersService.bulkApprove(body.ids ?? []);
  }

  @Post('partners/bulk-reject')
  @ApiOperation({ summary: '[Admin] Rejeitar vários parceiros de uma vez (com motivo opcional)' })
  async bulkRejectPartners(
    @Body() body: { ids: string[]; rejectionReason?: string },
  ): Promise<{ updated: number }> {
    return this.partnersService.bulkReject(body.ids ?? [], body.rejectionReason);
  }

  @Patch('partners/:id')
  @ApiOperation({ summary: '[Admin] Atualizar, aprovar ou rejeitar parceiro' })
  async updatePartner(@Param('id') id: string, @Body() dto: UpdatePartnerDto): Promise<PartnerAdminDto> {
    return this.partnersService.update(id, dto);
  }

  @Post('partners/:id/resend-confirmation')
  @ApiOperation({ summary: '[Admin] Reenviar e-mail de definir senha para parceiro que ainda não acessou o app' })
  async resendPartnerConfirmation(@Param('id') id: string): Promise<{ message: string }> {
    return this.partnersService.resendSetPasswordEmail(id);
  }

  @Post('partners/:id/end')
  @ApiOperation({ summary: '[Admin] Encerrar parceria (ONG ou paga). Desativa o parceiro e, se pago, cancela a assinatura no Stripe.' })
  async endPartnership(@Param('id') id: string): Promise<PartnerAdminDto> {
    return this.partnersService.endPartnership(id);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: '[Admin] Listar feature flags (habilitar/desabilitar funcionalidades)' })
  async getFeatureFlags(): Promise<{ key: string; enabled: boolean; description: string | null }[]> {
    return this.adminService.getFeatureFlags();
  }

  @Patch('feature-flags/:key')
  @ApiOperation({ summary: '[Admin] Habilitar ou desabilitar uma feature flag' })
  async setFeatureFlag(
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
  ): Promise<{ key: string; enabled: boolean }> {
    return this.adminService.setFeatureFlag(key, body.enabled);
  }
}
