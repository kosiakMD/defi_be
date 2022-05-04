import { Controller, Get, HttpStatus, Inject, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, NftEndpointsEnum } from '@app/common';
import { NftAssetsQueryDtoV1 } from '@app/common/dto/nft/nft.assets.query.dto.v1';
import { NftAssetsResponseDtoV1 } from '@app/common/dto/nft/nft.assets.response.dto.v1';
import { NftChainsResponseDto } from '@app/common/dto/nft/nft.chains.response.dto';
import { NftCollectionsQueryDtoV1 } from '@app/common/dto/nft/nft.collections.query.dto.v1';
import { NftCollectionsResponseDtoV1 } from '@app/common/dto/nft/nft.collections.response.dto.v1';

import { NftService } from '../modules/nft.service';

@ApiTags('Nft')
@Controller(NftEndpointsEnum.v1Nft)
export class NftController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly nftService: NftService,
  ) {}

  @Get(NftEndpointsEnum.chains)
  @ApiResponse({ status: HttpStatus.OK, type: NftChainsResponseDto })
  getChains() {
    try {
      return this.nftService.getChains();
    } catch (e) {
      this.logger.error(`getChains error: ${e.message}`);
      throw e;
    }
  }

  @Get(NftEndpointsEnum.collections)
  @ApiResponse({ status: HttpStatus.OK, type: NftCollectionsResponseDtoV1 })
  getCollections(@Query() query: NftCollectionsQueryDtoV1) {
    try {
      return this.nftService.getCollections(query);
    } catch (e) {
      this.logger.error(`getCollections error: ${e.message}`);
      throw e;
    }
  }

  @Get(NftEndpointsEnum.assets)
  @ApiResponse({ status: HttpStatus.OK, type: NftAssetsResponseDtoV1 })
  getAssets(@Query() query: NftAssetsQueryDtoV1) {
    try {
      return this.nftService.getAssets(query);
    } catch (e) {
      this.logger.error(`getAssets error: ${e.message}`);
      throw e;
    }
  }
}
