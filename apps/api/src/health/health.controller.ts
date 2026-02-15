import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Health check' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'adopet-api',
      version: '1.0.0',
    };
  }
}
