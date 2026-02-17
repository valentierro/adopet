import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { RequestVerificationDto } from './dto/request-verification.dto';
import { VerificationStatusDto } from './dto/verification-status.dto';
import { VerificationItemDto } from './dto/verification-status.dto';
import { ResolveVerificationDto } from './dto/resolve-verification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('verification')
@ApiBearerAuth()
@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('request')
  @ApiOperation({ summary: 'Solicitar verificação (usuário ou pet) com fotos de evidência' })
  async request(
    @CurrentUser() user: { id: string },
    @Body() dto: RequestVerificationDto,
  ): Promise<VerificationItemDto> {
    return this.verificationService.request(
      user.id,
      dto.type,
      dto.petId,
      dto.evidenceUrls,
      dto.skipEvidenceReason,
    );
  }

  @Get('status')
  @ApiOperation({ summary: 'Consultar status das solicitações de verificação' })
  async getStatus(@CurrentUser() user: { id: string }): Promise<VerificationStatusDto> {
    return this.verificationService.getStatus(user.id);
  }

  @Get('admin/pending')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[Admin] Listar solicitações pendentes' })
  async listPending(): Promise<VerificationItemDto[]> {
    return this.verificationService.listPending();
  }

  @Put('admin/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[Admin] Aprovar ou rejeitar solicitação' })
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveVerificationDto,
  ): Promise<VerificationItemDto> {
    return this.verificationService.resolve(id, dto.status, dto.rejectionReason);
  }

  @Get('admin/approved')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[Admin] Listar verificações aprovadas (para revogar)' })
  async listApproved(): Promise<VerificationItemDto[]> {
    return this.verificationService.listApproved();
  }

  @Put('admin/:id/revoke')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[Admin] Revogar verificação aprovada' })
  async revoke(@Param('id') id: string): Promise<VerificationItemDto> {
    return this.verificationService.revoke(id);
  }
}
