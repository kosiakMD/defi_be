import { HttpModule, Module } from '@nestjs/common';

import { AssetsModule } from '../assets/assets.module';
import { PriceModule } from '../price/price.module';
import { TransfersModule } from '../transfers/transfers.module';
import { AnalyticController } from './analytic.controller';
import { ProfitAndLossService } from './profitandloss.service';

@Module({
  imports: [HttpModule, AssetsModule, TransfersModule, PriceModule],
  providers: [ProfitAndLossService],
  controllers: [AnalyticController],
})
export class AnalyticModule {}
