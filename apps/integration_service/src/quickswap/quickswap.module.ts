import { Module } from '@nestjs/common';

import { Logger } from '@app/common';

import { AccountModule } from '../account/account.module';
import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { Web3Module } from './web3/web3.module';
import { QuickswapService } from './quickswap.service';

@Module({
  imports: [AccountModule, ChainModule, PriceModule, ThegraphModule, Web3Module],
  providers: [QuickswapService, Mapper, Logger],
  exports: [QuickswapService],
})
export class QuickswapModule {}
