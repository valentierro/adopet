import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PartnerRecommendationsService } from './partner-recommendations.service';
import { CreatePartnerRecommendationDto } from './dto/create-partner-recommendation.dto';

@ApiTags('partner-recommendations')
@Controller('partner-recommendations')
export class PartnerRecommendationsController {
  constructor(private readonly service: PartnerRecommendationsService) {}

  @Post()
  @ApiOperation({ summary: 'Indicar um parceiro (ONG, clínica ou loja). Usuário autenticado.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreatePartnerRecommendationDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ id: string }> {
    return this.service.create(dto, user.id);
  }
}
