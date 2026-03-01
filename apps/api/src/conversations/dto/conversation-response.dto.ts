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
  otherUser: { id: string; name: string; avatarUrl?: string; kycVerified?: boolean };

  @ApiProperty({ required: false })
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
    messageType?: string;
    metadata?: Record<string, unknown>;
  };

  @ApiProperty({ description: 'Mensagens não lidas (enviadas pelo outro)' })
  unreadCount: number;
}
