import { Module } from '@nestjs/common';
import { SavedSearchController } from './saved-search.controller';
import { SavedSearchService } from './saved-search.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SavedSearchController],
  providers: [SavedSearchService],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}
