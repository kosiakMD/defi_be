import { Module } from '@nestjs/common';

import { ThegraphModule } from '../thegraph/thegraph.module';
import { PoolsController } from './pools.controller';
import { PoolsServiceCommon } from './pools.service.common';
import { PoolsServiceSushiswap } from './pools.service.sushiswap';
import { PoolsServiceUniswap } from './pools.service.uniswap';

@Module({
  controllers: [PoolsController],
  imports: [ThegraphModule],
  providers: [PoolsServiceCommon, PoolsServiceUniswap, PoolsServiceSushiswap],
})
export class PoolsModule {}
