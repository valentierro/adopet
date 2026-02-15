import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Null para mensagens de sistema (ex.: anúncio expirado)' })
  senderId?: string;

  @ApiProperty({ description: 'True para mensagens geradas pelo sistema' })
  isSystem: boolean;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ required: false })
  readAt?: string;
}

export class MessagesPageDto {
  @ApiProperty({ type: [MessageItemDto] })
  items: MessageItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor: string | null;
}
