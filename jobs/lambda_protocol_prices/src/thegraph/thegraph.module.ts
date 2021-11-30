import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AaveSubgraph } from './aave/subgraph';
import { YearnSubgraph } from './yearn/subgraph';

const subgraphs = [
  AaveSubgraph, //
  YearnSubgraph,
];
@Module({
  imports: [HttpModule],
  providers: subgraphs,
  exports: subgraphs,
})
export class TheGraphModule {}
