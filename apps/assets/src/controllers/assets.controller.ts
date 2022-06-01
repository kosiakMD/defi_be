import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SearchParams } from '../common/interfaces/search.interfaces';

import { AssetCandidateRequest } from '../modules/assets/dto/asset-candidate.request';
import { GetAssetRequest } from '../modules/assets/dto/get-asset.request';
import { GetAssetResponse } from '../modules/assets/dto/get-asset.response';
import { GetAssetsRequest } from '../modules/assets/dto/get-assets.request';
import { GetAssetsResponse } from '../modules/assets/dto/get-assets.response';
import { SearchResultsEntryDto } from '../modules/assets/dto/search-results-entry.dto';
import { AssetsService } from '../modules/assets/services/assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: GetAssetResponse })
  async get(@Query() query: GetAssetRequest): Promise<GetAssetResponse> {
    const response = new GetAssetResponse();
    response.asset = await this.assetsService.getAsset(query);
    return response;
  }

  @Post('/get-bulk')
  @ApiBody({ type: GetAssetsRequest })
  @ApiResponse({ status: HttpStatus.OK, type: GetAssetsResponse })
  async getBulk(@Body() body: GetAssetsRequest): Promise<GetAssetsResponse> {
    const response = new GetAssetsResponse();
    response.assets = await this.assetsService.getBulkAssets(body.assets);
    return response;
  }

  @Get('/search')
  @ApiQuery({
    name: 'addresses',
    type: [String],
    description: 'address array to search assets by addresses',
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
    description: 'maximal number of search result entries',
    example: 30,
    required: false,
  })
  @ApiResponse({ status: HttpStatus.OK, type: [SearchResultsEntryDto] })
  async search(@Query() query: SearchParams): Promise<SearchResultsEntryDto[]> {
    return this.assetsService.search(query);
  }

  @Post('/candidate')
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  async saveAssetsCandidate(@Body() body: AssetCandidateRequest) {
    await this.assetsService.saveAssetCandidate(body);
    return HttpStatus.ACCEPTED;
  }
}
