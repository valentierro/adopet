import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { ModerationModule } from '../moderation/moderation.module';
import { VerificationModule } from '../verification/verification.module';
import { MatchEngineModule } from '../match-engine/match-engine.module';

@Module({
  imports: [ModerationModule, VerificationModule, MatchEngineModule],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
