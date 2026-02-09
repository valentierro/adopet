import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdoptionAutoApproveScheduler } from './adoption-auto-approve.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdoptionAutoApproveScheduler],
  exports: [AdminService],
})
export class AdminModule {}
