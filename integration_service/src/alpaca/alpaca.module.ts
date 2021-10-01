import { HttpModule, Module } from '@nestjs/common';

import { AccountModule } from '../account/account.module';
import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { AlpacaApiService } from './services/alpaca.api.service';
import { AlpacaService } from './services/alpaca.service';
import { AlpacaSubgraph } from './services/alpaca.subgraph';

@Module({
  imports: [HttpModule, PriceModule, AccountModule, ChainModule],
  providers: [AlpacaService, AlpacaSubgraph, AlpacaApiService],
  exports: [AlpacaService],
})
export class AlpacaModule {}
