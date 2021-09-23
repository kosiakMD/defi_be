import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { SushiswapService } from './sushiswap.service';

@Module({
  imports: [ThegraphModule, ChainModule, PriceModule],
  providers: [SushiswapService, Mapper],
  exports: [SushiswapService],
})
export class SushiswapModule {}
