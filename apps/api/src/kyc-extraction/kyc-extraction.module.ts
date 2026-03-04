import { Module, forwardRef } from '@nestjs/common';
import { KycExtractionService } from './kyc-extraction.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, UploadsModule, NotificationsModule, forwardRef(() => AdminModule)],
  providers: [KycExtractionService],
  exports: [KycExtractionService],
})
export class KycExtractionModule {}
