import { Module } from '@nestjs/common';
import { PartnerRecommendationsController } from './partner-recommendations.controller';
import { PartnerRecommendationsService } from './partner-recommendations.service';

@Module({
  controllers: [PartnerRecommendationsController],
  providers: [PartnerRecommendationsService],
  exports: [PartnerRecommendationsService],
})
export class PartnerRecommendationsModule {}
