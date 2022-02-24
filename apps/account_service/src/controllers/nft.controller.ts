import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  NotImplementedException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AddressesArray,
  ChainsArray,
  Logger,
  NftEndpointsEnum,
  NftProjectEnum,
  QueryString,
} from '@app/common';
import { NftAssetsQueryDto, NftProjectResponseDto } from '@app/common/dto/nft';
import { NftCollectionsQueryDto } from '@app/common/dto/nft/nft.collections.query.dto';
import { NftCollectionsResponseDto } from '@app/common/dto/nft/nft.collections.response.dto';
import { NftResponseDto } from '@app/common/dto/nft/nft.response.dto';
import {
  NftAssetsByAccounts,
  NftAssetsParams,
  NftServiceInfo,
} from '@app/common/interfaces/nft.interface';

import { NftService } from '../modules/nft/nft.service';

@ApiTags('Nft')
@Controller(NftEndpointsEnum.nft)
export class NftController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly nftService: NftService,
  ) {}

  @ApiResponse({ status: HttpStatus.OK, type: [NftProjectResponseDto] })
  @Get(NftEndpointsEnum.projects)
  public getProjects(): NftServiceInfo[] {
    try {
      return this.nftService.getProjects();
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  @Get(NftEndpointsEnum.collectionsByProjectName)
  @ApiQuery({ type: NftCollectionsQueryDto })
  @ApiResponse({ status: HttpStatus.OK, type: NftCollectionsResponseDto })
  async getCollections(
    @Param() { projectName }: NftAssetsParams,
    @AddressesArray('addresses') addresses: Address[],
    @ChainsArray('chains') chains: number[],
    @Query('collection') collection: string,
  ) {
    if (!Object.values(NftProjectEnum).includes(projectName)) {
      throw new NotImplementedException(`NFT project ${projectName} is not supported yet`);
    }

    try {
      return await this.nftService.getCollections(projectName, addresses, chains, collection);
    } catch (error) {
      this.logger.error(`Nft.getCollections: ${error}`);
      throw error;
    }
  }

  @ApiResponse({ status: HttpStatus.OK, type: NftResponseDto })
  @ApiParam({ enum: NftProjectEnum, name: 'projectName' })
  @ApiQuery({ type: NftAssetsQueryDto })
  @Get(NftEndpointsEnum.assetsByProjectName)
  public async getAssets(
    @Param() { projectName }: NftAssetsParams,
    @AddressesArray('addresses') addresses: Address[],
    @ChainsArray('chains') chains: number[],
    // @Query() collection: string,
    // @Query() query,
    @QueryString('collection') collection: string,
  ): Promise<NftAssetsByAccounts> {
    if (!Object.values(NftProjectEnum).includes(projectName)) {
      throw new NotImplementedException(`NFT project ${projectName} is not supported yet`);
    }

    // const { collection } = query;
    console.log(projectName, addresses, collection, chains);
    try {
      return await this.nftService.getAssets(projectName, addresses, collection, chains);
    } catch (error) {
      this.logger.error(`Nft.getAssets: ${error}`);
      throw error;
    }
  }
}
