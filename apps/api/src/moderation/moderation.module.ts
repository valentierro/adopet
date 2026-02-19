import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';

@Module({
  imports: [ConfigModule],
  controllers: [ReportsController, BlocksController],
  providers: [ReportsService, BlocksService],
  exports: [ReportsService, BlocksService],
})
export class ModerationModule {}
