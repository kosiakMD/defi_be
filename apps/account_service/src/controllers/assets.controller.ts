import { SearchResultsEntryDto } from 'apps/api_gateway/src/common/DTO/SearchResultsEntry.dto';
import {
  SearchParams,
  SearchResultsAssetEntry,
} from 'apps/api_gateway/src/search/interfaces/search.interface';
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

import { DetailedResponse } from '@app/common/interfaces';

import { AssetsPoolsService } from '../modules/assets/assets.pools.service';
import { AssetsService } from '../modules/assets/assets.service';
import {
  AssetDto,
  AssetQueryDto,
  AssetResponseDto,
  AssetTrackDto,
} from '../modules/assets/dto/asset.dto';
import { AssetsPoolsDto, AssetsPoolsPostResponseDto } from '../modules/assets/dto/assets.pools.dto';

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
  @ApiResponse({ status: HttpStatus.OK, type: [AssetDto] })
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
  @ApiResponse({ status: HttpStatus.OK, type: AssetResponseDto })
  async getAssetByAddressesAndChains(
    @Query() query: AssetQueryDto,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    const { addresses, chains } = query;

    return await this.assetsService.getAllAssetsByAddressesAndChains(addresses, chains);
  }

  @Post('')
  @ApiBody({ type: AssetTrackDto })
  @ApiResponse({ status: HttpStatus.OK, type: AssetResponseDto })
  async addAssetToTrack(@Body() asset: AssetTrackDto): Promise<AssetResponseDto> {
    return await this.assetsService.saveTrackingAsset(asset);
  }

  @Post('save')
  @ApiBody({ type: AssetDto })
  @ApiResponse({ status: HttpStatus.OK, type: AssetResponseDto })
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
  @ApiResponse({ status: HttpStatus.OK, type: AssetsPoolsDto })
  async getAssetInfoForLambda(@Query('chainId') chainId: number): Promise<AssetsPoolsDto[]> {
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
      this.logger.error(response);
      // TODO: commented as AllExceptionFilter handles this
      // res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
      throw response;
    }
  }

  @Get('/search')
  @ApiQuery({
    name: 'address',
    type: String,
    description: 'address to search assets by address',
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
    required: false,
  })
  @ApiQuery({
    name: 'text',
    type: String,
    description: 'text to search assets by name or symbol',
    example: 'CRO',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'maximal number of rearch result entries',
    example: 30,
    required: false,
  })
  @ApiResponse({ status: 200, type: [SearchResultsEntryDto] })
  async search(@Query() query: SearchParams): Promise<SearchResultsAssetEntry[]> {
    return this.assetsService.search(query);
  }
}
