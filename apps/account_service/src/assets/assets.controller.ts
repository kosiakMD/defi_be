import { Response } from 'express';

import {
  Body,
  CacheInterceptor,
  CacheKey,
  Controller,
  Get,
  HttpStatus,
  Inject,
  LoggerService,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common/enum';
import { DetailedResponse } from '@app/common/interfaces';

import { AssetsPoolsService } from './assets.pools.service';
import { AssetsService } from './assets.service';
import { AssetDto, AssetQueryDto, AssetResponseDto, AssetTrackDto } from './dto/asset.dto';
import { AssetsPoolsDto, AssetsPoolsPostResponseDto } from './dto/assets.pools.dto';

@ApiTags('Assets')
@UseInterceptors(CacheInterceptor)
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetsPoolsService: AssetsPoolsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}
  @CacheKey('accountService_all_assets')
  @Get('/all')
  @ApiResponse({ status: 200, type: [AssetDto] })
  async getAllAssets(): Promise<AssetDto[]> {
    try {
      return await this.assetsService.queryAllAssets();
    } catch (e) {
      this.logger.error(e, 'AssetsController.getAllAssets');
      throw e;
    }
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
  @ApiResponse({ status: 200, type: AssetResponseDto })
  async getAssetByAddressesAndChains(
    @Query() query: AssetQueryDto,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    const { addresses, chains } = query;

    return await this.assetsService.getAllAssetsByAddressesAndChains(addresses, chains);
  }

  @Post('')
  @ApiBody({ type: AssetTrackDto })
  @ApiResponse({ status: 200, type: AssetResponseDto })
  async addAssetToTrack(@Body() asset: AssetTrackDto): Promise<AssetResponseDto> {
    return await this.assetsService.saveTrackingAsset({
      assetAddress: asset.address,
      assetChain: asset.chain,
    });
  }

  @Post('save')
  @ApiBody({ type: AssetDto })
  @ApiResponse({ status: 200, type: AssetResponseDto })
  async saveAsset(@Body() asset: AssetDto): Promise<AssetResponseDto> {
    return await this.assetsService.saveAsset(asset);
  }

  @Get('/pools')
  @ApiQuery({
    name: 'chainId',
    type: Number,
    description: 'ID of network',
    example: 1,
    required: true,
  })
  @ApiResponse({ status: 200, type: AssetsPoolsDto })
  async getAssetInfoForLambda(@Query('chainId') chainId: ChainIdEnum): Promise<AssetsPoolsDto[]> {
    return await this.assetsService.getAssetAndPoolObjects(chainId);
  }

  @Post('/pools')
  @ApiBody({ type: [AssetsPoolsDto] })
  @ApiCreatedResponse({ type: AssetsPoolsPostResponseDto })
  @ApiInternalServerErrorResponse({ type: AssetsPoolsPostResponseDto })
  async saveAssetsPools(@Body() body: AssetsPoolsDto[], @Res() res: Response): Promise<void> {
    try {
      await this.assetsPoolsService.saveAssetsPoolsToDb(body);
      res.status(HttpStatus.CREATED).send(AssetsService.getResponseObject(true));
    } catch (e) {
      this.logger.error(e);
      const response = AssetsService.getResponseObject();
      response.error = e.stack;
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }
}
