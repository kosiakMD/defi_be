import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { UniswapService } from './uniswap.service';

@Module({
  imports: [ThegraphModule, ChainModule, PriceModule],
  providers: [UniswapService, Mapper],
  exports: [UniswapService],
})
export class UniswapModule {}
