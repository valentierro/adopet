import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { FeedModule } from './feed/feed.module';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './me/me.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { SwipesModule } from './swipes/swipes.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { ModerationModule } from './moderation/moderation.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VerificationModule } from './verification/verification.module';
import { SavedSearchModule } from './saved-search/saved-search.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    FeedModule,
    AuthModule,
    MeModule,
    UsersModule,
    PetsModule,
    UploadsModule,
    NotificationsModule,
    SwipesModule,
    FavoritesModule,
    ConversationsModule,
    MessagesModule,
    ModerationModule,
    VerificationModule,
    SavedSearchModule,
    AdminModule,
  ],
})
export class AppModule {}
