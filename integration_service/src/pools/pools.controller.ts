import { Controller, Get } from '@nestjs/common';

import { PoolsServiceSushiswap } from './pools.service.sushiswap';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsServiceSushiswap) {
  }

  @Get()
  getDataByAddresses(): any {
    return this.poolsService.getPoolsToHandle();
  }
}
