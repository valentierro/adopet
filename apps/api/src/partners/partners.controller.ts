import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import type { PartnerPublicDto } from './dto/partner-response.dto';
import type { PartnerCouponResponseDto } from './dto/partner-coupon-response.dto';

@ApiTags('partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar parceiros ativos e aprovados (público). Filtro opcional por tipo (ONG, CLINIC, STORE).' })
  async list(@Query('type') type?: string): Promise<PartnerPublicDto[]> {
    const normalized = type?.trim().toUpperCase();
    if (normalized && !['ONG', 'CLINIC', 'STORE'].includes(normalized)) {
      return this.partnersService.findActivePublic();
    }
    return this.partnersService.findActivePublic(normalized || undefined);
  }

  @Get(':id/coupons')
  @ApiOperation({ summary: 'Cupons ativos do parceiro (público – para usuários verem descontos).' })
  async getCoupons(@Param('id') id: string): Promise<PartnerCouponResponseDto[]> {
    return this.partnersService.findActivePublicCoupons(id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Registrar visualização da página do parceiro (analytics, público).' })
  async recordView(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.partnersService.recordProfileView(id);
    return { ok: true };
  }

  @Post(':id/coupons/:couponId/copy')
  @ApiOperation({ summary: 'Registrar cópia de cupom (analytics, público).' })
  async recordCouponCopy(
    @Param('id') id: string,
    @Param('couponId') couponId: string,
  ): Promise<{ ok: boolean }> {
    await this.partnersService.recordCouponCopy(id, couponId);
    return { ok: true };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Um parceiro por ID (público).' })
  async getOne(@Param('id') id: string): Promise<PartnerPublicDto | null> {
    return this.partnersService.findOneActivePublic(id);
  }
}
