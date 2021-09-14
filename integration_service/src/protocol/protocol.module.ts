import { PangolinModule } from 'src/pangolin/pangolin.module';

import { Module } from '@nestjs/common';

import { AccountModule } from '../account/account.module';
import { AutofarmModule } from '../autofarm/autofarm.module';
import { PriceModule } from '../price/price.module';
import { QuickswapModule } from '../quickswap/quickswap.module';
import { SpookyswapModule } from '../spookyswap/spookyswap.module';
import { SushiswapModule } from '../sushiswap/sushiswap.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { UniswapModule } from '../uniswap/uniswap.module';
import { ProtocolService } from './protocol.service';
import AutofarmProtocol from './protocols/autofarmProtocol';
import PancakeProtocolV1 from './protocols/pancakeProtocolV1';
import PangolinProtocol from './protocols/pangolinProtocol';
import { QuickswapProtocol } from './protocols/quickswapProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapProtocolV2';

// TODO to add a new Protocol just add it here and at ProtocolService constructor
const ProtocolList = [
  AutofarmProtocol,
  PancakeProtocolV1,
  PangolinProtocol,
  QuickswapProtocol,
  SpookySwapProtocol,
  SushiswapProtocolV2,
  UniswapProtocolV2,
];

@Module({
  imports: [
    AccountModule,
    PriceModule,
    ThegraphModule,
    UniswapModule,
    PangolinModule,
    SushiswapModule,
    SpookyswapModule,
    AutofarmModule,
    QuickswapModule,
  ],
  providers: [...ProtocolList, ProtocolService],
  exports: [ProtocolService],
})
export class ProtocolModule {}
