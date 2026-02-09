import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { AdoptionItemDto } from './dto/adoption-item.dto';
import { CreateAdoptionDto } from './dto/create-adoption.dto';
import { UserSearchItemDto } from './dto/user-search-item.dto';
import { PetAvailableItemDto } from './dto/pet-available-item.dto';
import { PendingAdoptionByTutorDto } from './dto/pending-adoption-by-tutor.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
