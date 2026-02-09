import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { NotificationsJobsService } from './notifications-jobs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PushService, NotificationsJobsService],
  exports: [PushService],
})
export class NotificationsModule {}
