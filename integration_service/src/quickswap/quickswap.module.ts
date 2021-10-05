import { Logger } from 'src/Logger/Logger.service';
import { Web3Provider } from 'src/chain/web3.provider';

import { Module } from '@nestjs/common';

import { AccountModule } from '../account/account.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { QuickswapService } from './quickswap.service';

@Module({
  imports: [AccountModule, PriceModule, ThegraphModule],
  providers: [QuickswapService, Mapper, Logger, Web3Provider],
  exports: [QuickswapService],
})
export class QuickswapModule {}
