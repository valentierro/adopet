import { Controller, Post, Get, Body, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StreamableFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UploadsService } from './uploads.service';
import { PresignDto } from './dto/presign.dto';
import { ConfirmUploadDto } from './dto/confirm.dto';
import { ConfirmAvatarDto } from './dto/confirm-avatar.dto';
import { ConfirmPartnerLogoDto } from './dto/confirm-partner-logo.dto';
import { PresignResponseDto } from './dto/presign-response.dto';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('serve')
  @ApiOperation({ summary: 'Servir arquivo do storage por key (público)' })
  async serve(@Query('key') key: string) {
    if (!key?.trim()) throw new NotFoundException();
    const result = await this.uploadsService.getObjectWithType(key);
    if (!result) throw new NotFoundException();
    return new StreamableFile(result.buffer, { type: result.contentType });
  }

  @Post('presign')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter URL assinada para upload' })
  async presign(
    @CurrentUser() user: { id: string },
    @Body() dto: PresignDto,
  ): Promise<PresignResponseDto> {
    return this.uploadsService.presign(user.id, dto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirmar upload e associar mídia ao pet' })
  async confirm(
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmUploadDto,
  ): Promise<{ id: string; url: string }> {
    return this.uploadsService.confirm(user.id, dto);
  }

  @Post('confirm-avatar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirmar upload de avatar e atualizar perfil' })
  async confirmAvatar(
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmAvatarDto,
  ): Promise<{ avatarUrl: string }> {
    return this.uploadsService.confirmAvatar(user.id, dto.key);
  }

  @Post('confirm-partner-logo')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirmar upload de logo do estabelecimento parceiro' })
  async confirmPartnerLogo(
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmPartnerLogoDto,
  ): Promise<{ logoUrl: string }> {
    return this.uploadsService.confirmPartnerLogo(user.id, dto.key);
  }
}
