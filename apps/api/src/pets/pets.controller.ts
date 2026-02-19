import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PetOwnerGuard } from './pet-owner.guard';
import { PetsService } from './pets.service';
import { MatchEngineService } from '../match-engine/match-engine.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PatchStatusDto } from './dto/patch-status.dto';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { PetResponseDto, SimilarPetItemDto } from './dto/pet-response.dto';

@ApiTags('pets')
@Controller('pets')
export class PetsController {
  constructor(
    private readonly petsService: PetsService,
    private readonly matchEngineService: MatchEngineService,
  ) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar meus pets (cursor) com filtros opcionais' })
  async findMine(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('species') species?: string,
    @Query('status') status?: string,
  ): Promise<{ items: PetResponseDto[]; nextCursor: string | null }> {
    return this.petsService.findMine(user.id, { cursor, species, status });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os pets (admin/debug)' })
  async findAll(): Promise<PetResponseDto[]> {
    return this.petsService.findAll();
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Listar anúncios pendentes de aprovação' })
  async findPendingPublication(): Promise<PetResponseDto[]> {
    return this.petsService.findPendingPublication();
  }

  @Get('by-partner/:partnerId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Anúncios vinculados ao parceiro (público). Se autenticado, inclui matchScore.' })
  async getByPartner(
    @Param('partnerId') partnerId: string,
    @Query('cursor') cursor?: string,
    @Query('species') species?: string,
    @CurrentUser() user?: { id: string },
  ): Promise<{ items: PetResponseDto[]; nextCursor: string | null }> {
    return this.petsService.findPublicByPartnerId(partnerId, {
      cursor,
      species,
      userId: user?.id,
    });
  }

  @Get('owner-profile-by-user/:userId')
  @ApiOperation({ summary: 'Perfil público de um usuário por id (ex.: interessado em quem priorizar)' })
  async getOwnerProfileByUserId(@Param('userId') userId: string) {
    const profile = await this.petsService.findOwnerProfileByUserId(userId);
    if (!profile) throw new NotFoundException('Usuário não encontrado');
    return profile;
  }

  @Patch(':id/publication')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Aprovar ou rejeitar anúncio para o feed' })
  async setPublicationStatus(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
  ): Promise<PetResponseDto> {
    const pet = await this.petsService.setPublicationStatus(id, body.status, body.rejectionReason);
    if (!pet) throw new NotFoundException('Pet não encontrado');
    return pet;
  }

  @Post(':id/resubmit-publication')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reenviar anúncio rejeitado para análise (apenas dono)' })
  async resubmitPublication(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<PetResponseDto> {
    return this.petsService.resubmitPublication(id, user.id);
  }

  @Get(':petId/owner-profile')
  @ApiOperation({ summary: 'Perfil público do tutor do pet (sem dados de contato)' })
  async getOwnerProfile(@Param('petId') petId: string) {
    const profile = await this.petsService.findOwnerProfileByPetId(petId);
    if (!profile) throw new NotFoundException('Pet ou tutor não encontrado');
    return profile;
  }

  @Get(':petId/owner-profile-admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Perfil do tutor com telefone (para confirmação de adoção)' })
  async getOwnerProfileForAdmin(@Param('petId') petId: string) {
    const profile = await this.petsService.findOwnerProfileByPetIdForAdmin(petId);
    if (!profile) throw new NotFoundException('Pet ou tutor não encontrado');
    return profile;
  }

  @Get(':id/conversation-partners')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuários que conversaram com o tutor sobre este pet (para indicar adotante)' })
  async getConversationPartners(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ id: string; name: string; username?: string }[]> {
    return this.petsService.getConversationPartners(id, user.id);
  }

  @Get(':id/similar')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Pets similares (engine: porte, idade, energia, temperamento, sexo, raça). Se autenticado, inclui matchScore com seu perfil.' })
  async getSimilar(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: { id: string },
  ): Promise<SimilarPetItemDto[]> {
    const limitNum = limit != null ? Math.min(24, Math.max(1, parseInt(limit, 10) || 12)) : 12;
    return this.petsService.getSimilarPetsWithScores(id, limitNum, user?.id);
  }

  @Post(':id/confirm-adoption')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adotante confirma que realizou a adoção (para seguir ao painel admin)' })
  async confirmAdoption(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ confirmed: boolean }> {
    return this.petsService.confirmAdoption(id, user.id);
  }

  @Get(':id/match-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Score de match entre o pet e um adotante (tutor ou adotante)' })
  async getMatchScore(
    @Param('id') id: string,
    @Query('adopterId') adopterId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!adopterId?.trim()) {
      throw new BadRequestException('adopterId é obrigatório');
    }
    return this.matchEngineService.getMatchScore(id, adopterId.trim(), user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pet por ID' })
  async findOne(@Param('id') id: string): Promise<PetResponseDto> {
    const pet = await this.petsService.findOne(id);
    if (!pet) throw new NotFoundException('Pet não encontrado');
    return pet;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cadastrar pet' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePetDto,
  ): Promise<PetResponseDto> {
    return this.petsService.create(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar pet (apenas dono)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePetDto,
  ): Promise<PetResponseDto> {
    return this.petsService.update(id, user.id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar status (AVAILABLE | IN_PROCESS | ADOPTED)' })
  async patchStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: PatchStatusDto,
  ): Promise<PetResponseDto> {
    return this.petsService.patchStatus(id, user.id, dto.status, dto.pendingAdopterId, dto.pendingAdopterUsername);
  }

  @Post(':id/extend')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Prorrogar anúncio por mais 60 dias (apenas tutor; pet disponível ou em andamento)' })
  async extendListing(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<PetResponseDto> {
    return this.petsService.extendListing(id, user.id);
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover foto do pet (apenas dono)' })
  async deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ message: string }> {
    await this.petsService.deleteMedia(id, user.id, mediaId);
    return { message: 'OK' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover anúncio (apenas dono; não permitido se status ADOPTED)' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ message: string }> {
    await this.petsService.delete(id, user.id);
    return { message: 'OK' };
  }

  @Patch(':id/media/reorder')
  @UseGuards(JwtAuthGuard, PetOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reordenar fotos do pet (apenas dono)' })
  async reorderMedia(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReorderMediaDto,
  ): Promise<PetResponseDto> {
    return this.petsService.reorderMedia(id, user.id, dto.mediaIds);
  }
}
