import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { LiquidityPoolsResponseDto } from './dto/liquidity.pools.response.dto';
import { PoolsService } from './pools.service';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Get()
  @ApiOkResponse({ type: LiquidityPoolsResponseDto, isArray: true })
  async getPoolsToDisplay(): Promise<LiquidityPoolsResponseDto[]> {
    const liquidityPoolsEntities = await this.poolsService.getPoolsToDisplay();
    return liquidityPoolsEntities.map((entity) =>
      new LiquidityPoolsResponseDto().fromEntityToDto(entity),
    );
  }
}
