import { Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  LoggerService,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ChainIdEnum } from '../common/enum';
import { DetailedResponse } from '../common/interfaces';

import { AssetsPoolsService } from './assets.pools.service';
import { AssetsService } from './assets.service';
import { AssetDto, AssetQueryDto, AssetResponseDto, AssetTrackDto } from './dto/asset.dto';
import { AssetsPoolsDto, AssetsPoolsPostResponseDto } from './dto/assets.pools.dto';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetsPoolsService: AssetsPoolsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}
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
  async addAssetToTrack(@Body() asset: AssetTrackDto): Promise<any> {
    return await this.assetsService.saveTrackingAsset({
      assetAddress: asset.address,
      assetChain: asset.chain,
    });
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
    return await this.assetsService.getAssetObjectsForLambda(chainId);
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
