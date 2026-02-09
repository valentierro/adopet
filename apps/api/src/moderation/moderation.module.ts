import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';

@Module({
  controllers: [ReportsController, BlocksController],
  providers: [ReportsService, BlocksService],
  exports: [ReportsService, BlocksService],
})
export class ModerationModule {}
