import { Body, Controller, Get, HttpStatus, Inject, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { logExecutionTime } from '@app/common/utils';

import { AssetCandidateRequest } from '../modules/assets/dto/asset-candidate.request';
import { GetAssetRequest } from '../modules/assets/dto/get-asset.request';
import { GetAssetsRequest } from '../modules/assets/dto/get-assets.request';
import { GetAssetsResponse } from '../modules/assets/dto/get-assets.response';
import { SearchAssetRequest } from '../modules/assets/dto/search-asset.request';
import { SearchResultsEntryDto } from '../modules/assets/dto/search-results-entry.dto';
import { AssetsService } from '../modules/assets/services/assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsService: AssetsService,
  ) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: GetAssetsResponse })
  async get(@Query() query: GetAssetRequest): Promise<GetAssetsResponse> {
    const response = new GetAssetsResponse();
    response.assets = await this.assetsService.getAsset(query);
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

  @Get('/accounted')
  @ApiQuery({
    name: 'chainId',
    type: Number,
    description: 'Chain id',
    example: 5,
    required: true,
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAssetsResponse })
  async getAccountedAssets(@Query() { chainId }: { chainId: number }): Promise<GetAssetsResponse> {
    // TODO: Test code, to be deleted
    return logExecutionTime(
      this.logger,
      `Get accounted assets for chain ${chainId} (api)`,
      async () => {
        const response = new GetAssetsResponse();
        response.assets = await this.assetsService.getAccountedAssetsByChain(chainId);
        return response;
      },
    );
  }

  @Get('/search')
  @ApiResponse({ status: HttpStatus.OK, type: [SearchResultsEntryDto] })
  async search(@Query() query: SearchAssetRequest): Promise<SearchResultsEntryDto[]> {
    return this.assetsService.search(query);
  }

  @Post('/candidate')
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  async saveAssetsCandidate(@Body() body: AssetCandidateRequest) {
    await this.assetsService.saveAssetCandidate(body);
    return HttpStatus.ACCEPTED;
  }
}
