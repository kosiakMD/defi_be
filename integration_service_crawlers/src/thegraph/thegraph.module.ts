import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BalancerSubgraph } from './balancer/balancer.subgraph';
import { BlocksBscSubgraph } from './blocks/blocks.bsc.subgraph';
import { BlocksSubgraph } from './blocks/blocks.subgraph';
import { CurveSubgraph } from './curve/curve.subgraph';
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
    BalancerSubgraph,
    CurveSubgraph,
    SushimasterchiefSubgraph,
    PancakeSubgraph,
    BlocksBscSubgraph,
  ],
  exports: [
    ThegraphModule,
    UniswapSubgraph,
    SushiswapSubgraph,
    BalancerSubgraph,
    CurveSubgraph,
    SushimasterchiefSubgraph,
    BlocksSubgraph,
    PancakeSubgraph,
    BlocksBscSubgraph,
  ],
})
export class ThegraphModule {}
