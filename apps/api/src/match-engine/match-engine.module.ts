import { Module } from '@nestjs/common';
import { MatchEngineService } from './match-engine.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MatchEngineService],
  exports: [MatchEngineService],
})
export class MatchEngineModule {}
