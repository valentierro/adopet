import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SimilarPetsEngineService } from './similar-pets-engine.service';

@Module({
  imports: [PrismaModule],
  providers: [SimilarPetsEngineService],
  exports: [SimilarPetsEngineService],
})
export class SimilarPetsEngineModule {}
