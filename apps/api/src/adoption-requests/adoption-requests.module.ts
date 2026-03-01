import { Module } from '@nestjs/common';
import { AdoptionRequestsController } from './adoption-requests.controller';
import { AdoptionRequestsService } from './adoption-requests.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PetPartnershipModule } from '../pet-partnership/pet-partnership.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdoptionFormsModule } from '../adoption-forms/adoption-forms.module';
import { PetsModule } from '../pets/pets.module';

@Module({
  imports: [
    PrismaModule,
    PetPartnershipModule,
    NotificationsModule,
    AdoptionFormsModule,
    PetsModule,
  ],
  controllers: [AdoptionRequestsController],
  providers: [AdoptionRequestsService],
  exports: [AdoptionRequestsService],
})
export class AdoptionRequestsModule {}
