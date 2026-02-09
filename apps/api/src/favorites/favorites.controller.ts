import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import type { FavoriteItemDto } from './dto/favorite-response.dto';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Adicionar pet aos favoritos' })
  async add(
    @CurrentUser() user: { id: string },
    @Body() dto: AddFavoriteDto,
  ): Promise<FavoriteItemDto> {
    return this.favoritesService.add(user.id, dto.petId);
  }

  @Delete(':petId')
  @ApiOperation({ summary: 'Remover pet dos favoritos' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('petId') petId: string,
  ): Promise<{ message: string }> {
    return this.favoritesService.remove(user.id, petId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar meus favoritos (cursor)' })
  async list(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
  ): Promise<{ items: FavoriteItemDto[]; nextCursor: string | null }> {
    return this.favoritesService.list(user.id, cursor);
  }
}
