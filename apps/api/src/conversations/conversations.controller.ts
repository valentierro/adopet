import { Controller, Get, Post, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import type { ConversationListItemDto } from './dto/conversation-response.dto';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar ou obter conversa (pet deve estar nos favoritos)' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConversationDto,
  ): Promise<{ id: string }> {
    return this.conversationsService.createOrGet(user.id, dto.petId, dto.adopterId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar minhas conversas' })
  async list(@CurrentUser() user: { id: string }): Promise<ConversationListItemDto[]> {
    return this.conversationsService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter uma conversa (para exibir outro participante e pet)' })
  async getOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{
    id: string;
    otherUser: { id: string; name: string };
    pet?: { name: string; photoUrl?: string };
    otherUserTyping?: boolean;
  }> {
    const conv = await this.conversationsService.getOne(id, user.id);
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    return conv;
  }

  @Post(':id/typing')
  @ApiOperation({ summary: 'Indicar que está digitando' })
  async typing(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const conv = await this.conversationsService.getOne(id, user.id);
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    this.conversationsService.setTyping(id, user.id);
    return { message: 'OK' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Apagar conversa (remove a conversa e todas as mensagens)' })
  async delete(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.conversationsService.delete(id, user.id);
    return { message: 'OK' };
  }
}
