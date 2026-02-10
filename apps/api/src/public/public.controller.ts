import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicStatsDto } from './dto/public-stats.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas públicas da plataforma (sem autenticação)' })
  async getStats(): Promise<PublicStatsDto> {
    return this.publicService.getStats();
  }
}
