import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

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

  /**
   * Versões do app mobile para checagem de atualização.
   * Lê de app-version.json (atualizado automaticamente pelo GitHub Action ao publicar tag v*).
   * Fallback: env APP_LATEST_VERSION e APP_MIN_SUPPORTED_VERSION.
   */
  @Get('app-config')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'App config (version check)' })
  appConfig() {
    let latest = this.config.get<string>('APP_LATEST_VERSION')?.trim() || '0.0.0';
    let minSupported = this.config.get<string>('APP_MIN_SUPPORTED_VERSION')?.trim() || '0.0.0';
    try {
      const path = join(__dirname, '..', 'app-version.json');
      if (existsSync(path)) {
        const data = JSON.parse(readFileSync(path, 'utf-8')) as { latestVersion?: string; minSupportedVersion?: string };
        if (data.latestVersion?.trim()) latest = data.latestVersion.trim();
        if (data.minSupportedVersion?.trim()) minSupported = data.minSupportedVersion.trim();
      }
    } catch {
      // keep env fallback
    }
    return { latestVersion: latest, minSupportedVersion: minSupported };
  }
}
