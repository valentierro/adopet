import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SavedSearchService } from './saved-search.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import type { SavedSearchItemDto } from './dto/saved-search-response.dto';

@ApiTags('saved-search')
@ApiBearerAuth()
@Controller('saved-search')
@UseGuards(JwtAuthGuard)
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Post()
  @ApiOperation({ summary: 'Salvar busca (me avise quando tiver pet que combine)' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSavedSearchDto,
  ): Promise<SavedSearchItemDto> {
    return this.savedSearchService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar minhas buscas salvas' })
  async list(@CurrentUser() user: { id: string }): Promise<SavedSearchItemDto[]> {
    return this.savedSearchService.list(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar busca salva' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
  ): Promise<SavedSearchItemDto> {
    return this.savedSearchService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover busca salva' })
  async delete(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.savedSearchService.delete(user.id, id);
  }
}
