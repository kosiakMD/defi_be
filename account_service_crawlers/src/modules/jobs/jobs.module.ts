import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EthTokenPriceService } from './ethTokenPrice.service';
import { EthTransactionPriceService } from './ethTransactionPrice.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  providers: [EthTokenPriceService, EthTransactionPriceService],
  exports: [EthTokenPriceService, EthTransactionPriceService],
})
export class JobsModule {}
