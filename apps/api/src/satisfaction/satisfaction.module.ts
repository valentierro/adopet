import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SatisfactionService } from './satisfaction.service';

@Module({
  imports: [PrismaModule],
  providers: [SatisfactionService],
  exports: [SatisfactionService],
})
export class SatisfactionModule {}
