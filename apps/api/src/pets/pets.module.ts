import { Module } from '@nestjs/common';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';
import { PetOwnerGuard } from './pet-owner.guard';
import { VerificationModule } from '../verification/verification.module';
import { MeModule } from '../me/me.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminModule } from '../admin/admin.module';
import { MatchEngineModule } from '../match-engine/match-engine.module';
import { SimilarPetsEngineModule } from '../similar-pets-engine/similar-pets-engine.module';

@Module({
  imports: [VerificationModule, MeModule, NotificationsModule, AdminModule, MatchEngineModule, SimilarPetsEngineModule],
  controllers: [PetsController],
  providers: [PetsService, PetOwnerGuard],
  exports: [PetsService],
})
export class PetsModule {}
