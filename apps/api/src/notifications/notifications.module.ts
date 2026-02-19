import { Module, forwardRef } from '@nestjs/common';
import { PushService } from './push.service';
import { InAppNotificationsService } from './in-app-notifications.service';
import { NotificationsJobsService } from './notifications-jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [PrismaModule, forwardRef(() => FeedModule)],
  providers: [PushService, InAppNotificationsService, NotificationsJobsService],
  exports: [PushService, InAppNotificationsService],
})
export class NotificationsModule {}
