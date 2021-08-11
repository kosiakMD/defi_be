import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Get, Query } from '@nestjs/common';
import { Controller, Inject } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DetailedResponse } from '../common/interfaces';
import { Logger } from 'src/common/Logger/Logger.service';

import { AssetResponseDto, AssetsDto, AssetsQueryDto } from './assets.dto';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsService: AssetsService,
  ) {}
  @Get('/all')
  @ApiResponse({ status: 200, type: AssetsDto, isArray: true })
  async queryAllAssets(): Promise<AssetsDto[]> {
    try {
      return await this.assetsService.getAllAssets();
    } catch (e) {
      this.logger.error(e, 'AssetsService.queryAllAssets');
      throw e;
    }
  }

  @Get('')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0x43e5ffd0c720b356b0b0e9f8c8178ad35dd4050c,0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2,0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974',
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    required: false,
    description: 'Array of chain ID (comma separated)',
    example: '1,2',
  })
  @ApiResponse({ status: 200, type: AssetResponseDto, isArray: true })
  async queryAssetsByAddressesAndChains(
    @Query() query: AssetsQueryDto,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    const { addresses, chains } = query;

    try {
      return await this.assetsService.getAssetsByAddressesAndChains(addresses, chains);
    } catch (e) {
      this.logger.error(e, 'AssetsService.queryAllAssets');
      throw e;
    }
  }
}
