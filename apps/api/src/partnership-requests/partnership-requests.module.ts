import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnersModule } from '../partners/partners.module';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { PartnershipRequestsService } from './partnership-requests.service';

@Module({
  imports: [PrismaModule, forwardRef(() => PartnersModule), EmailModule, forwardRef(() => AuthModule)],
  providers: [PartnershipRequestsService],
  exports: [PartnershipRequestsService],
})
export class PartnershipRequestsModule {}
