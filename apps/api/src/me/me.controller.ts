import { Controller, Get, Put, Post, Delete, Patch, Body, Param, Query, UseGuards, StreamableFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeService } from './me.service';
import { TutorStatsService } from './tutor-stats.service';
import { PartnersService } from '../partners/partners.service';
import { StripeService } from '../payments/stripe.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PushTokenDto } from './dto/push-token.dto';
import { UpdateMyPartnerDto } from '../partners/dto/update-my-partner.dto';
import { CreatePartnerCouponDto } from '../partners/dto/create-partner-coupon.dto';
import { UpdatePartnerCouponDto } from '../partners/dto/update-partner-coupon.dto';
import { CreatePartnerServiceDto } from '../partners/dto/create-partner-service.dto';
import { UpdatePartnerServiceDto } from '../partners/dto/update-partner-service.dto';
import { AddPartnerMemberDto } from '../partners/dto/add-partner-member.dto';
import { BulkAddPartnerMembersDto } from '../partners/dto/bulk-add-partner-members.dto';
import { UpdatePartnerMemberDto } from '../partners/dto/update-partner-member.dto';
import { CreateCheckoutSessionDto } from './dto/checkout-session.dto';
import { CreateBillingPortalSessionDto } from './dto/billing-portal.dto';
import { BecomePartnerDto } from './dto/become-partner.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { PreferencesResponseDto } from './dto/preferences-response.dto';
import type { MyAdoptionsResponseDto } from './dto/my-adoption-item.dto';
import type { PartnerMeDto } from '../partners/dto/partner-response.dto';
import type { PartnerCouponResponseDto } from '../partners/dto/partner-coupon-response.dto';
import type { PartnerServiceResponseDto } from '../partners/dto/partner-service-response.dto';
import type { PartnerMemberDto } from '../partners/partners.service';
import { TutorStatsResponseDto } from './dto/tutor-stats-response.dto';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import type { InAppNotificationItem } from '../notifications/in-app-notifications.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly tutorStatsService: TutorStatsService,
    private readonly partnersService: PartnersService,
    private readonly stripeService: StripeService,
    private readonly inAppNotificationsService: InAppNotificationsService,
  ) {}

  @Get('tutor-stats')
  @ApiOperation({ summary: 'Pontuação e nível do tutor (pets verificados e adotados)' })
  async getTutorStats(@CurrentUser() user: { id: string }): Promise<TutorStatsResponseDto> {
    return this.tutorStatsService.getStats(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Dados do usuário logado' })
  async getMe(@CurrentUser() user: { id: string }): Promise<MeResponseDto> {
    return this.meService.getMe(user.id);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Lista notificações in-app (ex.: parceria encerrada)' })
  async getMyNotifications(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ): Promise<InAppNotificationItem[]> {
    return this.inAppNotificationsService.listByUser(user.id, limit ? Math.min(Number(limit), 100) : 50);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Quantidade de notificações não lidas' })
  async getMyNotificationsUnreadCount(@CurrentUser() user: { id: string }): Promise<{ count: number }> {
    const count = await this.inAppNotificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  async markAllNotificationsAsRead(@CurrentUser() user: { id: string }): Promise<{ updated: number }> {
    return this.inAppNotificationsService.markAllAsRead(user.id);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  async markNotificationAsRead(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.inAppNotificationsService.markAsRead(user.id, id);
    return { ok: true };
  }

  @Get('pending-adoption-confirmations')
  @ApiOperation({ summary: 'Pets em que o usuário foi indicado como adotante e ainda não confirmou' })
  async getPendingAdoptionConfirmations(@CurrentUser() user: { id: string }) {
    return this.meService.getPendingAdoptionConfirmations(user.id);
  }

  @Get('partner')
  @ApiOperation({ summary: 'Dados do estabelecimento parceiro (portal do parceiro)' })
  async getMyPartner(@CurrentUser() user: { id: string }): Promise<PartnerMeDto | null> {
    return this.partnersService.getByUserId(user.id);
  }

  @Get('partner/subscription-details')
  @ApiOperation({ summary: 'Datas da assinatura: último pagamento e próximo vencimento (portal do parceiro)' })
  async getMyPartnerSubscriptionDetails(
    @CurrentUser() user: { id: string },
  ): Promise<{ lastPaymentAt: string | null; nextBillingAt: string | null }> {
    return this.stripeService.getSubscriptionBillingInfo(user.id);
  }

  @Get('partner/payment-history')
  @ApiOperation({ summary: 'Histórico de faturas/pagamentos da assinatura (portal do parceiro)' })
  async getMyPartnerPaymentHistory(
    @CurrentUser() user: { id: string },
  ): Promise<{ items: Array<{ paidAt: string; amountFormatted: string; status: string }> }> {
    return this.stripeService.getSubscriptionPaymentHistory(user.id);
  }

  @Get('partner/analytics')
  @ApiOperation({ summary: 'Analytics do parceiro (visualizações, cópias de cupom)' })
  async getMyPartnerAnalytics(
    @CurrentUser() user: { id: string },
  ): Promise<{ profileViews: number; couponCopies: number; byCoupon: Array<{ couponId: string; code: string; copies: number }> }> {
    return this.partnersService.getAnalyticsByUserId(user.id);
  }

  @Post('partner/checkout-session')
  @ApiOperation({ summary: 'Gerar link de pagamento Stripe para assinatura do plano' })
  async createPartnerCheckoutSession(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    return this.stripeService.createCheckoutSession(user.id, dto.planId, dto.successUrl, dto.cancelUrl);
  }

  @Post('partner/billing-portal')
  @ApiOperation({ summary: 'Gerar link do portal Stripe para gerenciar assinatura e cancelar' })
  async createPartnerBillingPortalSession(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBillingPortalSessionDto,
  ): Promise<{ url: string }> {
    return this.stripeService.createBillingPortalSession(user.id, dto.returnUrl);
  }

  @Post('partner/register')
  @ApiOperation({ summary: 'Usuário logado se tornar parceiro comercial (sem criar nova conta)' })
  async registerAsPartner(
    @CurrentUser() user: { id: string },
    @Body() dto: BecomePartnerDto,
  ): Promise<PartnerMeDto> {
    const existing = await this.partnersService.getByUserId(user.id);
    if (existing) {
      throw new BadRequestException('Você já é um parceiro. Use o portal do parceiro para gerenciar.');
    }
    let documentType: 'CPF' | 'CNPJ' | null = null;
    let document: string | null = null;
    if (dto.personType === 'PF' && dto.cpf) {
      const digits = dto.cpf.replace(/\D/g, '');
      if (digits.length !== 11) throw new BadRequestException('CPF deve ter 11 dígitos.');
      documentType = 'CPF';
      document = digits;
    } else if (dto.personType === 'CNPJ' && dto.cnpj) {
      const digits = dto.cnpj.replace(/\D/g, '');
      if (digits.length !== 14) throw new BadRequestException('CNPJ deve ter 14 dígitos.');
      documentType = 'CNPJ';
      document = digits;
    }
    await this.partnersService.createForUser(
      user.id,
      dto.establishmentName,
      dto.planId?.trim() || undefined,
      dto.address?.trim() || null,
      documentType,
      document,
      dto.legalName?.trim() || null,
      dto.tradeName?.trim() || null,
    );
    const partner = await this.partnersService.getByUserId(user.id);
    if (!partner) throw new BadRequestException('Parceiro não encontrado após cadastro.');
    return partner;
  }

  @Put('partner')
  @ApiOperation({ summary: 'Atualizar dados do estabelecimento (portal do parceiro)' })
  async updateMyPartner(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMyPartnerDto,
  ): Promise<PartnerMeDto> {
    return this.partnersService.updateByUserId(user.id, dto);
  }

  @Post('partner/leave')
  @ApiOperation({ summary: 'Desvincular minha ONG (só o admin sai; membros continuam vinculados à ONG inativa)' })
  async leaveMyPartner(@CurrentUser() user: { id: string }): Promise<{ message: string }> {
    return this.partnersService.leavePartnershipByUserId(user.id);
  }

  @Post('partner/leave-and-remove-members')
  @ApiOperation({ summary: 'Desvincular ONG e remover todos os membros (todos viram usuários comuns)' })
  async leaveMyPartnerAndRemoveMembers(@CurrentUser() user: { id: string }): Promise<{ message: string }> {
    return this.partnersService.leavePartnershipAndRemoveAllMembersByUserId(user.id);
  }

  @Get('partner/coupons')
  @ApiOperation({ summary: 'Listar cupons do estabelecimento parceiro' })
  async getMyPartnerCoupons(@CurrentUser() user: { id: string }): Promise<PartnerCouponResponseDto[]> {
    return this.partnersService.getCouponsByUserId(user.id);
  }

  @Post('partner/coupons')
  @ApiOperation({ summary: 'Criar cupom de desconto' })
  async createMyPartnerCoupon(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePartnerCouponDto,
  ): Promise<PartnerCouponResponseDto> {
    return this.partnersService.createCoupon(user.id, dto);
  }

  @Put('partner/coupons/:id')
  @ApiOperation({ summary: 'Atualizar cupom' })
  async updateMyPartnerCoupon(
    @CurrentUser() user: { id: string },
    @Param('id') couponId: string,
    @Body() dto: UpdatePartnerCouponDto,
  ): Promise<PartnerCouponResponseDto> {
    return this.partnersService.updateCoupon(user.id, couponId, dto);
  }

  @Delete('partner/coupons/:id')
  @ApiOperation({ summary: 'Excluir cupom' })
  async deleteMyPartnerCoupon(
    @CurrentUser() user: { id: string },
    @Param('id') couponId: string,
  ): Promise<{ message: string }> {
    return this.partnersService.deleteCoupon(user.id, couponId);
  }

  @Get('partner/services')
  @ApiOperation({ summary: 'Listar serviços do estabelecimento parceiro' })
  async getMyPartnerServices(@CurrentUser() user: { id: string }): Promise<PartnerServiceResponseDto[]> {
    return this.partnersService.getServicesByUserId(user.id);
  }

  @Post('partner/services')
  @ApiOperation({ summary: 'Criar serviço prestado' })
  async createMyPartnerService(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePartnerServiceDto,
  ): Promise<PartnerServiceResponseDto> {
    return this.partnersService.createService(user.id, dto);
  }

  @Put('partner/services/:id')
  @ApiOperation({ summary: 'Atualizar serviço' })
  async updateMyPartnerService(
    @CurrentUser() user: { id: string },
    @Param('id') serviceId: string,
    @Body() dto: UpdatePartnerServiceDto,
  ): Promise<PartnerServiceResponseDto> {
    return this.partnersService.updateService(user.id, serviceId, dto);
  }

  @Delete('partner/services/:id')
  @ApiOperation({ summary: 'Excluir serviço' })
  async deleteMyPartnerService(
    @CurrentUser() user: { id: string },
    @Param('id') serviceId: string,
  ): Promise<{ message: string }> {
    return this.partnersService.deleteService(user.id, serviceId);
  }

  @Get('partner/members')
  @ApiOperation({ summary: 'Listar membros da ONG (apenas para parceiro type=ONG)' })
  async getMyPartnerMembers(@CurrentUser() user: { id: string }): Promise<PartnerMemberDto[]> {
    return this.partnersService.listMembersByUserId(user.id);
  }

  @Post('partner/members')
  @ApiOperation({ summary: 'Adicionar membro à ONG (apenas para parceiro type=ONG)' })
  async addMyPartnerMember(
    @CurrentUser() user: { id: string },
    @Body() dto: AddPartnerMemberDto,
  ): Promise<PartnerMemberDto> {
    return this.partnersService.addMemberByUserId(user.id, dto);
  }

  @Get('partner/members/bulk/template')
  @ApiOperation({ summary: 'Download do modelo CSV para importação em lote de membros (ONG)' })
  getMyPartnerMembersBulkTemplate(): StreamableFile {
    const csv =
      'email,nome,telefone,funcao\n' +
      'membro@exemplo.org,Maria Silva,11999999999,VOLUNTARIO\n';
    const buffer = Buffer.from(csv, 'utf-8');
    return new StreamableFile(buffer, {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="membros_modelo.csv"',
    });
  }

  @Post('partner/members/bulk')
  @ApiOperation({ summary: 'Adicionar membros em lote à ONG (máx. 25 por vez; apenas para parceiro type=ONG)' })
  async bulkAddMyPartnerMembers(
    @CurrentUser() user: { id: string },
    @Body() dto: BulkAddPartnerMembersDto,
  ): Promise<{ created: number; errors: { row: number; message: string }[] }> {
    return this.partnersService.bulkAddMembersByUserId(
      user.id,
      dto.members.map((m) => ({
        email: m.email,
        name: m.name,
        phone: m.phone,
        role: m.role,
      })),
    );
  }

  @Put('partner/members/:userId')
  @ApiOperation({ summary: 'Atualizar membro da ONG (ex.: função) (apenas para parceiro type=ONG)' })
  async updateMyPartnerMember(
    @CurrentUser() user: { id: string },
    @Param('userId') memberUserId: string,
    @Body() dto: UpdatePartnerMemberDto,
  ): Promise<PartnerMemberDto> {
    return this.partnersService.updateMemberByUserId(user.id, memberUserId, {
      role: dto.role === '' ? null : dto.role,
    });
  }

  @Delete('partner/members/:userId')
  @ApiOperation({ summary: 'Remover membro da ONG (apenas para parceiro type=ONG)' })
  async removeMyPartnerMember(
    @CurrentUser() user: { id: string },
    @Param('userId') memberUserId: string,
  ): Promise<{ message: string }> {
    return this.partnersService.removeMemberByUserId(user.id, memberUserId);
  }

  @Post('partner/members/:userId/resend-invite')
  @ApiOperation({ summary: 'Reenviar e-mail de convite para membro que ainda não ativou (apenas para parceiro type=ONG)' })
  async resendMyPartnerMemberInvite(
    @CurrentUser() user: { id: string },
    @Param('userId') memberUserId: string,
  ): Promise<{ message: string }> {
    return this.partnersService.resendMemberInviteByUserId(user.id, memberUserId);
  }

  @Get('partner/members/:userId/details')
  @ApiOperation({ summary: 'Perfil público e pets de um membro da ONG (apenas admin ONG)' })
  async getMyPartnerMemberDetails(
    @CurrentUser() user: { id: string },
    @Param('userId') memberUserId: string,
  ) {
    return this.partnersService.getMemberDetailsByUserId(user.id, memberUserId);
  }

  @Get('adoptions')
  @ApiOperation({ summary: 'Listar pets que o usuário adotou (como adotante)' })
  async getMyAdoptions(
    @CurrentUser() user: { id: string },
    @Query('species') species?: 'BOTH' | 'DOG' | 'CAT',
  ): Promise<MyAdoptionsResponseDto> {
    return this.meService.getMyAdoptions(user.id, species);
  }

  @Get('lookup-username/:username')
  @ApiOperation({ summary: 'Buscar usuário por @nome (para indicar adotante ao marcar pet como adotado)' })
  async lookupUsername(@Param('username') username: string): Promise<{ id: string; name: string; username: string } | null> {
    return this.meService.lookupByUsername(username);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar dados do titular (portabilidade – LGPD art. 18 V)' })
  async exportData(@CurrentUser() user: { id: string }): Promise<Record<string, unknown>> {
    return this.meService.exportData(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Atualizar nome/foto do perfil' })
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponseDto> {
    return this.meService.updateMe(user.id, dto);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Obter preferências do usuário' })
  async getPreferences(
    @CurrentUser() user: { id: string },
  ): Promise<PreferencesResponseDto> {
    return this.meService.getPreferences(user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Atualizar preferências (espécie e raio)' })
  async updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    return this.meService.updatePreferences(user.id, dto);
  }

  @Put('push-token')
  @ApiOperation({ summary: 'Registrar token para push notifications' })
  async updatePushToken(
    @CurrentUser() user: { id: string },
    @Body() dto: PushTokenDto,
  ): Promise<{ message: string }> {
    return this.meService.updatePushToken(user.id, dto.pushToken ?? null);
  }

  @Put('deactivate')
  @ApiOperation({ summary: 'Desativar conta e excluir/anonimizar dados (LGPD)' })
  async deactivate(@CurrentUser() user: { id: string }): Promise<{ message: string }> {
    return this.meService.deactivate(user.id);
  }
}
