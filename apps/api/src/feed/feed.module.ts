import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { AuthModule } from '../auth/auth.module';
import { ModerationModule } from '../moderation/moderation.module';
import { VerificationModule } from '../verification/verification.module';
import { MatchEngineModule } from '../match-engine/match-engine.module';
import { PetsModule } from '../pets/pets.module';
import { PetPartnershipModule } from '../pet-partnership/pet-partnership.module';

@Module({
  imports: [AuthModule, ModerationModule, VerificationModule, MatchEngineModule, PetsModule, PetPartnershipModule],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
