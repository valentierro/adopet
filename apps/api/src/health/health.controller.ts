import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const version = this.config.get<string>('APP_VERSION')?.trim() || '1.0.0';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
        service: 'adopet-api',
        version,
      });
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'adopet-api',
      version,
    };
  }

  /**
   * Versões do app mobile para checagem de atualização.
   * Lê de app-version.json (atualizado automaticamente pelo GitHub Action ao publicar tag v*).
   * Tenta vários caminhos para funcionar em dist/, em monorepo ou cwd da API.
   * Fallback: env APP_LATEST_VERSION e APP_MIN_SUPPORTED_VERSION.
   */
  @Get('app-config')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'App config (version check)' })
  appConfig() {
    let latest = this.config.get<string>('APP_LATEST_VERSION')?.trim() || '0.0.0';
    let minSupported = this.config.get<string>('APP_MIN_SUPPORTED_VERSION')?.trim() || '0.0.0';
    const candidates = [
      join(__dirname, '..', 'app-version.json'), // dist/app-version.json quando roda de dist/
      join(process.cwd(), 'app-version.json'), // cwd da API (ex.: apps/api ou raiz do deploy)
      join(process.cwd(), 'dist', 'app-version.json'),
    ];
    for (const path of candidates) {
      try {
        if (existsSync(path)) {
          const data = JSON.parse(readFileSync(path, 'utf-8')) as {
            latestVersion?: string;
            minSupportedVersion?: string;
          };
          if (data.latestVersion?.trim()) latest = data.latestVersion.trim();
          if (data.minSupportedVersion?.trim()) minSupported = data.minSupportedVersion.trim();
          break;
        }
      } catch {
        // tenta próximo caminho
      }
    }
    return { latestVersion: latest, minSupportedVersion: minSupported };
  }
}
