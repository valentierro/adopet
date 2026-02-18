import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminBulkController } from './admin-bulk.controller';
import { AdminService } from './admin.service';
import { AdminBulkService } from './admin-bulk.service';
import { AdoptionAutoApproveScheduler } from './adoption-auto-approve.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BugReportsModule } from '../bug-reports/bug-reports.module';
import { PartnerRecommendationsModule } from '../partner-recommendations/partner-recommendations.module';
import { PartnersModule } from '../partners/partners.module';
import { PartnershipRequestsModule } from '../partnership-requests/partnership-requests.module';

@Module({
  imports: [PrismaModule, AuthModule, BugReportsModule, PartnerRecommendationsModule, PartnersModule, PartnershipRequestsModule],
  controllers: [AdminController, AdminBulkController],
  providers: [AdminService, AdminBulkService, AdoptionAutoApproveScheduler],
  exports: [AdminService],
})
export class AdminModule {}
