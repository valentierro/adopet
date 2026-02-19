import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
