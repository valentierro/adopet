import { ApiProperty } from '@nestjs/swagger';

export class MessageItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

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
