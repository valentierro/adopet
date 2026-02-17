import { Module, forwardRef } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { FeedModule } from '../feed/feed.module';
import { MeModule } from '../me/me.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    EmailModule,
    forwardRef(() => FeedModule),
    forwardRef(() => MeModule),
    forwardRef(() => VerificationModule),
  ],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
