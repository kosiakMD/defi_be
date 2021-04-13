import { Controller, Get } from '@nestjs/common';
import { LiquidityPoolsEntity } from './entities/liquidity.pools.entity';
import { PoolsService } from './pools.service';

@Controller('pools')
export class PoolsController {
  constructor(
    private readonly poolsService: PoolsService
  ) {
  }

  @Get()
  getPoolsToDisplay(): Promise<LiquidityPoolsEntity[]> {
    return this.poolsService.getPoolsToDisplay()
  }
}
