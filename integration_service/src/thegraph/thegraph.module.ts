import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlocksSubgraph } from './blocks.subgraph';
import { PancakeSubgraph } from './pancake.subgraph';
import { SushiswapSubgraph } from './sushiswap.subgraph';
import { UniswapSubgraph } from './uniswap.subgraph';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [UniswapSubgraph, BlocksSubgraph, SushiswapSubgraph, PancakeSubgraph],
  exports: [ThegraphModule, UniswapSubgraph, SushiswapSubgraph, BlocksSubgraph, PancakeSubgraph],
})
export class ThegraphModule {}
