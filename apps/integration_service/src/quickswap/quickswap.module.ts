import { Module } from '@nestjs/common';

import { Logger } from '@app/common/Logger/Logger.service';

import { AccountModule } from '../account/account.module';
import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { MultiCallModule } from './multicall/multicall.module';
import { QuickswapService } from './quickswap.service';

@Module({
  imports: [AccountModule, ChainModule, PriceModule, ThegraphModule, Logger, MultiCallModule],
  providers: [QuickswapService, Mapper],
  exports: [QuickswapService],
})
export class QuickswapModule {}
