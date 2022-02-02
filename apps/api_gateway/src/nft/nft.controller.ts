import { Controller, Get, HttpStatus, NotImplementedException, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  Address,
  AddressesArray,
  ChainsArray,
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

import { BaseService } from '../common/services/base.service';

@ApiTags('Nft')
@Controller(NftEndpointsEnum.v1Nft)
export class NftController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @ApiResponse({ status: HttpStatus.OK, type: [NftProjectResponseDto] })
  @Get(NftEndpointsEnum.projects)
  public async getProjects(): Promise<NftServiceInfo[]> {
    return this.requestProxy(this.url + 'v1/nft/projects');
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
    return this.requestProxy(this.url + 'v1/nft/collections/' + projectName, 'GET', {
      params: { addresses, chains, collection },
    });
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
    return this.requestProxy(this.url + 'v1/nft/assets/' + projectName, 'GET', {
      params: { addresses, collection, chains },
    });
  }
}
