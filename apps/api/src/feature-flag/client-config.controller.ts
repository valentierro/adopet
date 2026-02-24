import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FeatureFlagService } from './feature-flag.service';
import { PrismaService } from '../prisma/prisma.service';

export type ClientConfigDto = {
  ngoProUiEnabled: boolean;
  ngoSponsorshipUiEnabled: boolean;
  donationsUiEnabled: boolean;
};

@ApiTags('client-config')
@Controller('client-config')
export class ClientConfigController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Config para UI (feature flags de visibilidade). Auth opcional; se logado, usa escopo do parceiro/cidade.' })
  @ApiBearerAuth()
  async getConfig(
    @CurrentUser() user?: { id: string },
  ): Promise<ClientConfigDto> {
    let context: { userId?: string; partnerId?: string; cityId?: string } = {};
    if (user?.id) {
      const partner = await this.prisma.partner.findUnique({
        where: { userId: user.id },
        select: { id: true, city: true },
      });
      if (partner) {
        context = { userId: user.id, partnerId: partner.id, cityId: partner.city ?? undefined };
      } else {
        const membership = await this.prisma.partnerMember.findFirst({
          where: { userId: user.id },
          include: { partner: { select: { id: true, city: true } } },
        });
        if (membership?.partner) {
          context = {
            userId: user.id,
            partnerId: membership.partner.id,
            cityId: membership.partner.city ?? undefined,
          };
        } else {
          const u = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { city: true },
          });
          context = { userId: user.id, cityId: u?.city ?? undefined };
        }
      }
    }

    const [ngoProUiEnabled, ngoSponsorshipUiEnabled, donationsUiEnabled] = await Promise.all([
      this.featureFlagService.isEnabled('NGO_PRO_UI_ENABLED', context),
      this.featureFlagService.isEnabled('NGO_SPONSORSHIP_UI_ENABLED', context),
      this.featureFlagService.isEnabled('DONATIONS_UI_ENABLED', context),
    ]);

    return { ngoProUiEnabled, ngoSponsorshipUiEnabled, donationsUiEnabled };
  }
}
