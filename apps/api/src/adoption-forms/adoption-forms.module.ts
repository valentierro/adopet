import { Module } from '@nestjs/common';
import { AdoptionFormsController } from './adoption-forms.controller';
import { AdoptionFormsService } from './adoption-forms.service';
import { MatchScoreService } from './match-score.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PetPartnershipModule } from '../pet-partnership/pet-partnership.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, PetPartnershipModule, NotificationsModule],
  controllers: [AdoptionFormsController],
  providers: [AdoptionFormsService, MatchScoreService],
  exports: [AdoptionFormsService, MatchScoreService],
})
export class AdoptionFormsModule {}
