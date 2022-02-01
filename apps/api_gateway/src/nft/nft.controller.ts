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
} from '@app/common';
import {
  NftAssetsQueryDto,
  NftCollectionsQueryDto,
  NftProjectResponseDto,
} from '@app/common/dto/nft';
import { NftCollectionsResponseDto } from '@app/common/dto/nft/nft.collections.response.dto';
import { NftResponseDto } from '@app/common/dto/nft/nft.response.dto';
import {
  NftAssetsByAccounts,
  NftAssetsParams,
  NftServiceInfo,
} from '@app/common/interfaces/nft.interface';

import { AccountService } from '../account/account.service';

@ApiTags('Nft')
@Controller(NftEndpointsEnum.v1Nft)
export class NftController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
  ) {}

  @ApiResponse({ status: HttpStatus.OK, type: [NftProjectResponseDto] })
  @Get(NftEndpointsEnum.projects)
  public async getProjects(): Promise<NftServiceInfo[]> {
    try {
      return await this.accountService.getNftProjects();
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
      return await this.accountService.getNftCollections(
        projectName,
        addresses,
        chains,
        collection,
      );
    } catch (error) {
      this.logger.error(`Nft.getCollections: ${error}`);
      throw error;
    }
  }

  @ApiResponse({ status: HttpStatus.OK, type: NftResponseDto })
  @ApiParam({ enum: NftProjectEnum, name: 'projectName' })
  @ApiQuery({ type: NftAssetsQueryDto })
  @Get(NftEndpointsEnum.assetsByProjectName)
  public async getAssetsByProject(
    @Param() { projectName }: NftAssetsParams,
    @AddressesArray('addresses') addresses: Address[],
    @ChainsArray('chains') chains: number[],
    @Query('collection') collection?: string,
  ): Promise<NftAssetsByAccounts> {
    if (!Object.values(NftProjectEnum).includes(projectName)) {
      throw new NotImplementedException(`NFT project ${projectName} is not supported yet`);
    }

    try {
      return await this.accountService.getNftAssets(projectName, addresses, collection, chains);
    } catch (e) {
      this.logger.error(`Nft.getAssetsByProject: ${e}`);
      return e;
    }
  }
}
