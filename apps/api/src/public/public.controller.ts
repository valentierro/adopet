import { Controller, Get, Post, Body, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicStatsDto } from './dto/public-stats.dto';
import { PartnershipRequestDto } from './dto/partnership-request.dto';

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

  @Post('partnership-request')
  @ApiOperation({ summary: 'Envia solicitação de parceria por e-mail (ONG ou comercial, sem autenticação)' })
  async partnershipRequest(@Body() dto: PartnershipRequestDto): Promise<{ ok: true }> {
    await this.publicService.sendPartnershipRequest(dto);
    return { ok: true };
  }
}
