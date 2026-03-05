/** Adopet API - NestJS app root module */
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
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
import { AdoptionFormsModule } from './adoption-forms/adoption-forms.module';
import { AdoptionRequestsModule } from './adoption-requests/adoption-requests.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PublicModule } from './public/public.module';
import { PaymentsModule } from './payments/payments.module';
import { EmailModule } from './email/email.module';
import { PriorityEngineModule } from './priority-engine/priority-engine.module';
import { FeatureFlagModule } from './feature-flag/feature-flag.module';

@Module({
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: SlowRequestLoggerInterceptor },
  ],
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      // Base: .env (comum). Depois .env.development ou .env.production sobrescreve (DATABASE_URL, JWT, S3, Stripe).
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
    }),
    FeatureFlagModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }], // 100 requests per minute per IP
    }),
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
    AdoptionFormsModule,
    AdoptionRequestsModule,
    MarketplaceModule,
    PublicModule,
  ],
})
export class AppModule {}
