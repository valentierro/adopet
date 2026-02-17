import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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
import { UpdatePartnerMemberDto } from '../partners/dto/update-partner-member.dto';
import { CreateCheckoutSessionDto } from './dto/checkout-session.dto';
import { CreateBillingPortalSessionDto } from './dto/billing-portal.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { PreferencesResponseDto } from './dto/preferences-response.dto';
import type { MyAdoptionsResponseDto } from './dto/my-adoption-item.dto';
import type { PartnerMeDto } from '../partners/dto/partner-response.dto';
import type { PartnerCouponResponseDto } from '../partners/dto/partner-coupon-response.dto';
import type { PartnerServiceResponseDto } from '../partners/dto/partner-service-response.dto';
import type { PartnerMemberDto } from '../partners/partners.service';
import { TutorStatsResponseDto } from './dto/tutor-stats-response.dto';

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

  @Put('partner')
  @ApiOperation({ summary: 'Atualizar dados do estabelecimento (portal do parceiro)' })
  async updateMyPartner(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMyPartnerDto,
  ): Promise<PartnerMeDto> {
    return this.partnersService.updateByUserId(user.id, dto);
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
