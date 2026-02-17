import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { SlowRequestLoggerInterceptor } from './common/slow-request-logger.interceptor';
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
import { BugReportsModule } from './bug-reports/bug-reports.module';
import { PartnerRecommendationsModule } from './partner-recommendations/partner-recommendations.module';
import { PartnersModule } from './partners/partners.module';
import { PublicModule } from './public/public.module';
import { PaymentsModule } from './payments/payments.module';
import { EmailModule } from './email/email.module';
import { PriorityEngineModule } from './priority-engine/priority-engine.module';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: SlowRequestLoggerInterceptor },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    HealthModule,
    FeedModule,
    AuthModule,
    MeModule,
    PaymentsModule,
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
    PriorityEngineModule,
    AdminModule,
    BugReportsModule,
    PartnerRecommendationsModule,
    PartnersModule,
    PublicModule,
  ],
})
export class AppModule {}
