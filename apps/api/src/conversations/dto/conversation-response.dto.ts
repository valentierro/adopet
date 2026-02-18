import { ApiProperty } from '@nestjs/swagger';

export class ConversationListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  petId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  pet: { id: string; name: string; photos: string[]; adoptionFinalized: boolean };

  @ApiProperty()
  otherUser: { id: string; name: string; avatarUrl?: string };

  @ApiProperty({ required: false })
  lastMessage?: { content: string; createdAt: string; senderId: string };

  @ApiProperty({ description: 'Mensagens não lidas (enviadas pelo outro)' })
  unreadCount: number;
}
