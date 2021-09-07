import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlocksSubgraph } from './blocks/blocks.subgraph';
import { PancakeSubgraph } from './pancake/pancake.subgraph';
import { SushimasterchiefSubgraph } from './sushimasterchief/sushimasterchief.subgraph';
import { SushiswapSubgraph } from './sushiswap/sushiswap.subgraph';
import { UniswapSubgraph } from './uniswap/uniswap.subgraph';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule.forRoot(),
  ],
  providers: [
    UniswapSubgraph,
    BlocksSubgraph,
    SushiswapSubgraph,
    SushimasterchiefSubgraph,
    PancakeSubgraph,
  ],
  exports: [
    TheGraphModule,
    UniswapSubgraph,
    SushiswapSubgraph,
    SushimasterchiefSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
  ],
})
export class TheGraphModule {}
