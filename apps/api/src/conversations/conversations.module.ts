import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { TypingService } from './typing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PetPartnershipModule } from '../pet-partnership/pet-partnership.module';

@Module({
  imports: [PrismaModule, ModerationModule, NotificationsModule, PetPartnershipModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, TypingService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
