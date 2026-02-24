import { Module } from '@nestjs/common';
import { PetPartnershipService } from './pet-partnership.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [PetPartnershipService],
  exports: [PetPartnershipService],
})
export class PetPartnershipModule {}
