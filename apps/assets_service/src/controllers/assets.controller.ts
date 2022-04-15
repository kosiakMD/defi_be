import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SearchResultsEntryDto } from '../common/dto/SearchResultsEntry.dto';
import { SearchParams, SearchResultsAssetEntry } from '../common/interfaces/search.interface';

import { AssetsCandidateDto } from '../modules/assets/dto/assets-candidate.dto';
import { AssetsGetDto } from '../modules/assets/dto/assets-get.dto';
import { AssetsEntity } from '../modules/assets/entities/assets.entity';
import { AssetsService } from '../modules/assets/services/assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK })
  // TODO: Create DTO instead of database objects
  // TODO: Return prices for assets
  get(@Query() query: AssetsGetDto): Promise<AssetsEntity> {
    // TODO: Return something from API
    return this.assetsService.getAsset(query);
  }

  @Post('/get-bulk')
  @ApiResponse({ status: HttpStatus.OK })
  getBulk(@Body() body: AssetsGetDto[]): Promise<AssetsEntity[]> {
    // TODO: Return something from API
    return this.assetsService.getBulkAssets(body);
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
