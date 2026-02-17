import { Module, forwardRef } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MeModule } from '../me/me.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => MeModule)],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
