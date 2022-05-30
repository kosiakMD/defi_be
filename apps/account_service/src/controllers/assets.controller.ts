import {
  CacheInterceptor,
  Controller,
  Get,
  HttpStatus,
  Inject,
  LoggerService,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ResultStatus } from '@app/common';
import { DetailedResponse } from '@app/common/interfaces';

import { AssetsService } from '../modules/assets/assets.service';
import { AssetQueryDto } from '../modules/assets/dto/asset-query.dto';
import { AssetResponseDto } from '../modules/assets/dto/asset-response.dto';

@ApiTags('Assets')
@UseInterceptors(CacheInterceptor)
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

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
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    ],
  })
  @ApiResponse({ status: HttpStatus.OK, type: AssetResponseDto })
  async getAssetByAddressesAndChains(
    @Query() query: AssetQueryDto,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    const { addresses, chains } = query;
    const [chain] = chains;

    const data = await this.assetsService.fetchAssets(addresses, chain);
    return { errors: [], status: ResultStatus.ok, data };
  }
  // TODO: do we need this endpoint?
  // @CacheKey('accountService_all_assets')
  // @Get('/all')
  // @ApiResponse({ status: HttpStatus.OK, type: [AssetDto] })
  // async getAllAssets(): Promise<AssetDto[]> {
  //   try {
  //     return await this.assetsService.queryAllAssets();
  //   } catch (e) {
  //     this.logger.error(e, 'AssetsController.getAllAssets');
  //     throw e;
  //   }
  // }

  // TODO: TBD do we need this endpoint?
  // @Get('/pools')
  // @ApiQuery({
  //   name: 'chainId',
  //   type: Number,
  //   description: 'ID of network',
  //   example: 1,
  //   required: true,
  // })
  // @ApiResponse({ status: HttpStatus.OK, type: AssetsPoolsDto })
  // async getAssetInfoForLambda(@Query('chainId') chainId: number): Promise<AssetsPoolsDto[]> {
  //   return await this.assetsService.getAssetAndPoolObjects(chainId);
  // }
}
