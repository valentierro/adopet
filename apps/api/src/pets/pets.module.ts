import { Module } from '@nestjs/common';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';
import { PetOwnerGuard } from './pet-owner.guard';
import { VerificationModule } from '../verification/verification.module';
import { MeModule } from '../me/me.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [VerificationModule, MeModule, NotificationsModule, AdminModule],
  controllers: [PetsController],
  providers: [PetsService, PetOwnerGuard],
  exports: [PetsService],
})
export class PetsModule {}
