import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { SushiswapController } from './sushiswap.controller';
import { SushiswapService } from './sushiswap.service';

@Module({
  imports: [ThegraphModule, ChainModule, PriceModule],
  controllers: [SushiswapController],
  providers: [SushiswapService, Mapper],
  exports: [SushiswapService],
})
export class SushiswapModule {}
