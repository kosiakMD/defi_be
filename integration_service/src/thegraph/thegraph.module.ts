import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlocksSubgraph } from './blocks.subgraph';
import { PancakeSubgraph } from './pancake.subgraph';
import { PangolinSubgraph } from './pangolin.subgraph';
import { QuickswapSubgraph } from './quickswap.subgraph';
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
    UniswapSubgraph,
    UniswapV3Subgraph,
    BlocksSubgraph,
    SushiswapSubgraph,
    PangolinSubgraph,
    PancakeSubgraph,
    QuickswapSubgraph,
  ],
  exports: [
    ThegraphModule,
    UniswapSubgraph,
    UniswapV3Subgraph,
    SushiswapSubgraph,
    PangolinSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
    QuickswapSubgraph,
  ],
})
export class ThegraphModule {}
