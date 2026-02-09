import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('blocks')
@ApiBearerAuth()
@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @ApiOperation({ summary: 'Bloquear usuário' })
  async block(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBlockDto,
  ): Promise<{ blocked: true }> {
    return this.blocksService.block(user.id, dto);
  }

  @Delete(':blockedUserId')
  @ApiOperation({ summary: 'Desbloquear usuário' })
  async unblock(
    @CurrentUser() user: { id: string },
    @Param('blockedUserId') blockedUserId: string,
  ): Promise<{ unblocked: true }> {
    return this.blocksService.unblock(user.id, blockedUserId);
  }
}
