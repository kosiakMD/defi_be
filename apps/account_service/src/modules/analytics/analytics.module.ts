import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { PriceService } from '../../common/providers/microservices/price/price.service';

import { AnalyticsController } from '../../controllers/analytics.controller';
import { AssetsModule } from '../assets/assets.module';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ChainsModule } from '../chains/chains.module';
import { TransfersModule } from '../transfers/transfers.module';
import { ProfitAndLossService } from './profitandloss.service';

@Module({
  imports: [HttpModule, ChainsModule, AssetsModule, TransfersModule, BlacklistModule],
  providers: [ProfitAndLossService, PriceService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
