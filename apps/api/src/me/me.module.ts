import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { TutorStatsService } from './tutor-stats.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';
import { PartnersModule } from '../partners/partners.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, VerificationModule, PartnersModule, PaymentsModule],
  controllers: [MeController],
  providers: [MeService, TutorStatsService],
  exports: [MeService, TutorStatsService],
})
export class MeModule {}
