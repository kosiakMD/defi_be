import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AlpacaSubgraph } from '../protocol/protocols/alpaca/services/alpaca.subgraph';
import { AutofarmSubgraph } from '../protocol/protocols/autofarm/services/autofarm.subgraph';
import { AaveSubgraph } from './aave.subgraph';
import { BlocksSubgraph } from './blocks.subgraph';
import { PancakeSubgraph } from './pancake.subgraph';
import { PangolinSubgraph } from './pangolin.subgraph';
import { QuickswapSubgraph } from './quickswap.subgraph';
import { SpookyswapAceLabSubgraph } from './spookyswap.acelab.subgraph';
import { SpookyswapFarmSubgraph } from './spookyswap.farm.subgraph';
import { SushiswapSubgraph } from './sushiswap.subgraph';
import { UniswapSubgraph } from './uniswap.subgraph';
import { UniswapV3Subgraph } from './uniswap.v3.subgraph';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [
    AaveSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
    PangolinSubgraph,
    QuickswapSubgraph,
    SpookyswapAceLabSubgraph,
    SpookyswapFarmSubgraph,
    SushiswapSubgraph,
    UniswapSubgraph,
    UniswapV3Subgraph,
    AutofarmSubgraph,
    AlpacaSubgraph,
  ],
  exports: [
    ThegraphModule,
    AaveSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
    PangolinSubgraph,
    QuickswapSubgraph,
    SpookyswapAceLabSubgraph,
    SpookyswapFarmSubgraph,
    SushiswapSubgraph,
    UniswapSubgraph,
    UniswapV3Subgraph,
    AutofarmSubgraph,
    AlpacaSubgraph,
  ],
})
export class ThegraphModule {}
