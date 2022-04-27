import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetAssetsResponseDto } from '../common/dto/GetAssetsResponse.dto';
import { HistoricalPricesQuery } from '../common/dto/HistoricalPricesQuery.dto';
import { SearchResultsEntryDto } from '../common/dto/SearchResultsEntry.dto';
import { SearchParams, SearchResultsAssetEntry } from '../common/interfaces/search.interface';

import { AssetsCandidateDto } from '../modules/assets/dto/assets-candidate.dto';
import { AssetsGetDto } from '../modules/assets/dto/assets-get.dto';
import { AssetsService } from '../modules/assets/services/assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('/')
  @ApiQuery({
    name: 'address',
    type: String,
    description: 'address to get or process an asset',
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
    required: true,
  })
  @ApiQuery({
    name: 'chainId',
    type: Number,
    description: 'text to search assets by name or symbol',
    example: 22,
    required: true,
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAssetsResponseDto })
  async get(@Query() query: AssetsGetDto): Promise<GetAssetsResponseDto> {
    return new GetAssetsResponseDto([await this.assetsService.getAsset(query)]);
  }

  @Post('/get-bulk')
  @ApiQuery({
    name: 'address',
    type: String,
    description: 'address to get or process an asset',
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
    required: true,
  })
  @ApiQuery({
    name: 'chainId',
    type: Number,
    description: 'text to search assets by name or symbol',
    example: 22,
    required: true,
  })
  @ApiBody({ type: [AssetsGetDto] })
  @ApiResponse({ status: HttpStatus.OK, type: GetAssetsResponseDto })
  async getBulk(
    @Body() body: AssetsGetDto[],
    @Query() query: HistoricalPricesQuery,
  ): Promise<GetAssetsResponseDto> {
    return new GetAssetsResponseDto(await this.assetsService.getBulkAssets(body, query));
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

  @Post('/candidate')
  @ApiResponse({ status: HttpStatus.OK })
  saveAssetsCandidate(@Body() body: AssetsCandidateDto) {
    return this.assetsService.saveAssetCandidate(body);
  }
}
