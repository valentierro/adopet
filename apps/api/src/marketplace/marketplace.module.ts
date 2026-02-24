import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [PartnersModule],
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}
