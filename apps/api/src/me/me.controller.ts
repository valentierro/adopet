import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeService } from './me.service';
import { TutorStatsService } from './tutor-stats.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PushTokenDto } from './dto/push-token.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { PreferencesResponseDto } from './dto/preferences-response.dto';
import { TutorStatsResponseDto } from './dto/tutor-stats-response.dto';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly tutorStatsService: TutorStatsService,
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
  @ApiOperation({ summary: 'Desativar conta (soft delete)' })
  async deactivate(@CurrentUser() user: { id: string }): Promise<{ message: string }> {
    return this.meService.deactivate(user.id);
  }
}
