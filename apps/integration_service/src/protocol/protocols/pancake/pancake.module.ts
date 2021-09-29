import { Module } from '@nestjs/common';

import { AccountModule } from '../../../account/account.module';
import { ChainModule } from '../../../chain/chain.module';
import { EtherscanModule } from '../../../etherscan/etherscan.module';
import { PoolsModule } from '../../../pools/pools.module';
import { PriceModule } from '../../../price/price.module';
import { ThegraphModule } from '../../../thegraph/thegraph.module';
import { Mapper } from '../mappers/mapper';
import { PancakePriceService } from './pancake.price.service';
import { PancakeService } from './pancake.service';

@Module({
  imports: [ThegraphModule, ChainModule, PriceModule, AccountModule, PoolsModule, EtherscanModule],
  providers: [PancakeService, PancakePriceService, Mapper],
  exports: [PancakeService],
})
export class PancakeModule {}
