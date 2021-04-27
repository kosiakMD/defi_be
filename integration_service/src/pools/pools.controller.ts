import { Controller, Get } from '@nestjs/common';
import { PoolsService } from './pools.service';
import { LiquidityPoolsResponseDto } from './dto/liquidity.pools.response.dto';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Get()
  async getPoolsToDisplay(): Promise<LiquidityPoolsResponseDto[]> {
    const liquidityPoolsEntities = await this.poolsService.getPoolsToDisplay();
    return liquidityPoolsEntities.map(entity => new LiquidityPoolsResponseDto().fromEntityToDto(entity));
  }
}
