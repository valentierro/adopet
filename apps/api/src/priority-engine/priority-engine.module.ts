import { Module } from '@nestjs/common';
import { PriorityEngineService } from './priority-engine.service';
import { PriorityEngineController } from './priority-engine.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchEngineModule } from '../match-engine/match-engine.module';

@Module({
  imports: [PrismaModule, MatchEngineModule],
  controllers: [PriorityEngineController],
  providers: [PriorityEngineService],
  exports: [PriorityEngineService],
})
export class PriorityEngineModule {}
