import { Controller, Post, Body, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SwipesService } from './swipes.service';
import { CreateSwipeDto } from './dto/create-swipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('swipes')
@ApiBearerAuth()
@Controller('swipes')
@UseGuards(JwtAuthGuard)
export class SwipesController {
  constructor(private readonly swipesService: SwipesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar like ou pass em um pet' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSwipeDto,
  ) {
    return this.swipesService.create({ ...dto, userId: user.id });
  }

  @Get('passed')
  @ApiOperation({ summary: 'Listar pets que você passou (para reconsiderar)' })
  async getPassed(@CurrentUser() user: { id: string }) {
    return this.swipesService.getPassed(user.id);
  }

  @Delete('passed/:petId')
  @ApiOperation({ summary: 'Desfazer pass (pet volta ao feed)' })
  async undoPass(
    @CurrentUser() user: { id: string },
    @Param('petId') petId: string,
  ) {
    return this.swipesService.deleteByPetId(user.id, petId);
  }
}
