import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnersModule } from '../partners/partners.module';
import { PartnershipRequestsService } from './partnership-requests.service';

@Module({
  imports: [PrismaModule, PartnersModule],
  providers: [PartnershipRequestsService],
  exports: [PartnershipRequestsService],
})
export class PartnershipRequestsModule {}
