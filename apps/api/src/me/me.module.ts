import { Module, forwardRef } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { TutorStatsService } from './tutor-stats.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';
import { PartnersModule } from '../partners/partners.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PetPartnershipModule } from '../pet-partnership/pet-partnership.module';
import { SatisfactionModule } from '../satisfaction/satisfaction.module';

@Module({
  imports: [PrismaModule, forwardRef(() => VerificationModule), forwardRef(() => PartnersModule), PaymentsModule, NotificationsModule, PetPartnershipModule, SatisfactionModule],
  controllers: [MeController],
  providers: [MeService, TutorStatsService],
  exports: [MeService, TutorStatsService],
})
export class MeModule {}
