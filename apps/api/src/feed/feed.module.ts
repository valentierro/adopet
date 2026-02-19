import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { AuthModule } from '../auth/auth.module';
import { ModerationModule } from '../moderation/moderation.module';
import { VerificationModule } from '../verification/verification.module';
import { MatchEngineModule } from '../match-engine/match-engine.module';
import { PetsModule } from '../pets/pets.module';

@Module({
  imports: [AuthModule, ModerationModule, VerificationModule, MatchEngineModule, PetsModule],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
