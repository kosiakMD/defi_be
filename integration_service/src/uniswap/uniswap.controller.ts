import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';

import BaseDataDto from './dto/BaseData.dto';
import { UniswapBurnsEntity } from './entities/uniswap.burns.entity';
import { UniswapMintsEntity } from './entities/uniswap.mints.entity';
import { UniswapSwapsEntity } from './entities/uniswap.swaps.entity';
import { UniswapBurnsRepository } from './repository/uniswap.burns.repository';
import { UniswapMintsRepository } from './repository/uniswap.mints.repository';
import { UniswapSwapsRepository } from './repository/uniswap.swaps.repository';
import { UniswapService } from './uniswap.service';
import {Base} from "../interfaces/transactions.interfaces";

@Controller('integration')
export class UniswapController {
  constructor(
    private readonly integrationService: UniswapService,
    @InjectRepository(UniswapSwapsEntity) private readonly swapsRepository: UniswapSwapsRepository,
    @InjectRepository(UniswapMintsEntity) private readonly mintsRepository: UniswapMintsRepository,
    @InjectRepository(UniswapBurnsEntity) private readonly burnRepository: UniswapBurnsRepository,
  ) {}

  @Get('/uniswap')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0x43e5ffd0c720b356b0b0e9f8c8178ad35dd4050c,0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2,0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974',
  })
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getDataByAddresses(@Query('addresses') addresses: string): Promise<Base[]> {
    if (!addresses) {
      return Promise.resolve([]);
    }
    return this.integrationService.getDataByAddress(addresses);
  }
}
