import { HttpModule, Module } from '@nestjs/common';

import { AccountModule } from '../account/account.module';
import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { PriceService } from '../price/price.service';
import { AutofarmService } from './services/autofarm.service';
import { AutofarmSubgraph } from './services/autofarm.subgraph';

@Module({
  imports: [ChainModule, HttpModule, PriceModule, AccountModule],
  providers: [AutofarmService, AutofarmSubgraph, PriceService],
  exports: [AutofarmService],
})
export class AutofarmModule {}
