import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { MessageItemDto } from './dto/message-response.dto';
import type { MessagesPageDto } from './dto/message-response.dto';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('conversations/:conversationId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mensagens (cursor)' })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
  ): Promise<MessagesPageDto> {
    return this.messagesService.getPage(conversationId, user.id, cursor);
  }

  @Post()
  @ApiOperation({ summary: 'Enviar mensagem (texto e/ou imagem)' })
  async send(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ): Promise<MessageItemDto> {
    return this.messagesService.send(conversationId, user.id, { content: dto.content, imageUrl: dto.imageUrl });
  }
}
