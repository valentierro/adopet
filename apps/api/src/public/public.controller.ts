import { Controller, Get, Post, Body, Query, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicStatsDto } from './dto/public-stats.dto';
import { PartnershipRequestDto } from './dto/partnership-request.dto';
import { RecentAdoptionsResponseDto } from './dto/recent-adoptions.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('stats')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Estatísticas públicas da plataforma (sem autenticação)' })
  async getStats(): Promise<PublicStatsDto> {
    return this.publicService.getStats();
  }

  @Get('recent-adoptions')
  @Header('Cache-Control', 'public, max-age=120')
  @ApiOperation({ summary: 'Últimas adoções realizadas no app (prova social, sem autenticação)' })
  async getRecentAdoptions(
    @Query('limit') limit?: string,
  ): Promise<RecentAdoptionsResponseDto> {
    const n = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 30)) : 30;
    const items = await this.publicService.getRecentAdoptions(n);
    return { items };
  }

  @Post('partnership-request')
  @ApiOperation({ summary: 'Envia solicitação de parceria por e-mail (ONG ou comercial, sem autenticação)' })
  async partnershipRequest(@Body() dto: PartnershipRequestDto): Promise<{ ok: true }> {
    await this.publicService.sendPartnershipRequest(dto);
    return { ok: true };
  }
}
