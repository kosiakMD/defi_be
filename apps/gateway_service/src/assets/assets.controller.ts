import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DetailedResponse } from '../common/interfaces';
import { BaseService } from '../common/services/base.service';

import { AssetResponseDto, AssetsDto } from './dto/assets.dto';

@ApiTags('Assets')
@Controller('v1/assets')
export class AssetsController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @Get('/all')
  @ApiResponse({ status: HttpStatus.OK, type: AssetsDto, isArray: true })
  async queryAllAssets(): Promise<AssetsDto[]> {
    return this.requestProxy(this.url + 'v1/assets/all', 'GET');
  }

  @Get('')
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    example: [1, 2],
    required: false,
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of address',
    example: [
      '0x0000000000000000000000000000000000000000',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    ],
  })
  // TODO: TBD clarify and cleanup
  // @ApiQuery({
  //   name: 'addresses',
  //   type: String,
  //   description: 'Array of Addresses (comma separated)',
  //   example:
  //     '0x43e5ffd0c720b356b0b0e9f8c8178ad35dd4050c,0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2,0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974',
  // })
  // @ApiQuery({
  //   name: 'chains',
  //   type: String,
  //   required: false,
  //   description: 'Array of chain ID (comma separated)',
  //   example: '1,2',
  // })
  @ApiResponse({ status: HttpStatus.OK, type: AssetResponseDto, isArray: true })
  async queryAssetsByAddressesAndChains(
    @Query() query,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    return this.requestProxy(this.url + 'v1/assets', 'GET', { params: query });
  }
}
