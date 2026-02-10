import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { BugReportsService } from '../bug-reports/bug-reports.service';
import { PartnersService } from '../partners/partners.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { AdoptionItemDto } from './dto/adoption-item.dto';
import { CreateAdoptionDto } from './dto/create-adoption.dto';
import { UserSearchItemDto } from './dto/user-search-item.dto';
import { PetAvailableItemDto } from './dto/pet-available-item.dto';
import { PendingAdoptionByTutorDto } from './dto/pending-adoption-by-tutor.dto';
import type { BugReportResponseDto } from '../bug-reports/dto/bug-report-response.dto';
import type { PartnerAdminDto } from '../partners/dto/partner-response.dto';
import { CreatePartnerDto } from '../partners/dto/create-partner.dto';
import { UpdatePartnerDto } from '../partners/dto/update-partner.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly bugReportsService: BugReportsService,
    private readonly partnersService: PartnersService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: '[Admin] Dashboard: totais de adoções, pendentes, etc.' })
  async getStats(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Get('adoptions')
  @ApiOperation({ summary: '[Admin] Listar adoções registradas (tutor + adotante)' })
  async getAdoptions(): Promise<AdoptionItemDto[]> {
    return this.adminService.getAdoptions();
  }

  @Post('adoptions')
  @ApiOperation({ summary: '[Admin] Registrar adoção (pet + adotante); define tutor pelo dono do pet' })
  async createAdoption(@Body() dto: CreateAdoptionDto): Promise<AdoptionItemDto> {
    return this.adminService.createAdoption(dto.petId, dto.adopterUserId);
  }

  @Get('users')
  @ApiOperation({ summary: '[Admin] Buscar usuários por nome ou email (para selecionar adotante)' })
  async searchUsers(@Query('search') search?: string): Promise<UserSearchItemDto[]> {
    return this.adminService.searchUsers(search ?? '');
  }

  @Get('pets-available')
  @ApiOperation({ summary: '[Admin] Listar pets disponíveis para adoção (para registrar adoção)' })
  async getPetsAvailable(): Promise<PetAvailableItemDto[]> {
    return this.adminService.getPetsAvailable();
  }

  @Get('pending-adoptions-by-tutor')
  @ApiOperation({ summary: '[Admin] Pets marcados como adotados pelo tutor (aguardando registro/confirmação)' })
  async getPendingAdoptionsByTutor(): Promise<PendingAdoptionByTutorDto[]> {
    return this.adminService.getPendingAdoptionsByTutor();
  }

  @Post('pending-adoptions-by-tutor/:petId/reject')
  @ApiOperation({ summary: '[Admin] Rejeitar marcação de adoção pelo tutor; pet volta a disponível e não computa pontos' })
  async rejectPendingAdoptionByTutor(@Param('petId') petId: string): Promise<{ message: string }> {
    await this.adminService.rejectPendingAdoptionByTutor(petId);
    return { message: 'OK' };
  }

  @Get('bug-reports')
  @ApiOperation({ summary: '[Admin] Listar reports de bugs enviados pelos usuários (beta)' })
  async getBugReports(): Promise<BugReportResponseDto[]> {
    return this.bugReportsService.findAllForAdmin();
  }

  @Get('partners')
  @ApiOperation({ summary: '[Admin] Listar todos os parceiros (ONG, clínicas, lojas)' })
  async getPartners(): Promise<PartnerAdminDto[]> {
    return this.partnersService.findAllAdmin();
  }

  @Post('partners')
  @ApiOperation({ summary: '[Admin] Cadastrar parceiro' })
  async createPartner(@Body() dto: CreatePartnerDto): Promise<PartnerAdminDto> {
    return this.partnersService.create(dto);
  }

  @Patch('partners/:id')
  @ApiOperation({ summary: '[Admin] Atualizar ou aprovar parceiro' })
  async updatePartner(@Param('id') id: string, @Body() dto: UpdatePartnerDto): Promise<PartnerAdminDto> {
    return this.partnersService.update(id, dto);
  }
}
