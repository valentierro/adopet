import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { NotificationsJobsService } from './notifications-jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [PrismaModule, FeedModule],
  providers: [PushService, NotificationsJobsService],
  exports: [PushService],
})
export class NotificationsModule {}
