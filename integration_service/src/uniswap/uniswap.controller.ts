import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';

import { UniswapBurnsEntity } from './entities/uniswap.burns.entity';
import { UniswapMintsEntity } from './entities/uniswap.mints.entity';
import { UniswapSwapsEntity } from './entities/uniswap.swaps.entity';
import { UniswapBurnsRepository } from './repository/uniswap.burns.repository';
import { UniswapMintsRepository } from './repository/uniswap.mints.repository';
import { UniswapSwapsRepository } from './repository/uniswap.swaps.repository';
import { Base } from './uniswap.interfaces';
import { UniswapService } from './uniswap.service';

@Controller('integration')
export class UniswapController {
  constructor(
    private readonly integrationService: UniswapService,
    @InjectRepository(UniswapSwapsEntity) private readonly swapsRepository: UniswapSwapsRepository,
    @InjectRepository(UniswapMintsEntity) private readonly mintsRepository: UniswapMintsRepository,
    @InjectRepository(UniswapBurnsEntity) private readonly burnRepository: UniswapBurnsRepository,
  ) {
  }

  @Get('/uniswap')
  @ApiResponse({ status: 200 })
  getDataByAddresses(@Query('address') addresses: string): Promise<Base[]> {
    return this.integrationService.getDataByAddress(addresses);
  }
}
