import { Module } from '@nestjs/common';

import { AccountModule } from '../account/account.module';
import { PriceModule } from '../price/price.module';
import { SushiswapModule } from '../sushiswap/sushiswap.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { UniswapModule } from '../uniswap/uniswap.module';
import { ProtocolService } from './protocol.service';
import PancakeProtocolV1 from './protocols/pancakeProtocolV1';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapProtocolV2';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [UniswapProtocolV2, SushiswapProtocolV2, PancakeProtocolV1];

@Module({
  imports: [AccountModule, PriceModule, UniswapModule, ThegraphModule, SushiswapModule],
  providers: [...ProtocolList, ProtocolService],
  exports: [ProtocolService],
})
export class ProtocolModule {}
