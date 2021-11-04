import {
  Controller,
  Get,
  HttpStatus,
  NotImplementedException,
  Inject,
  Param,
} from '@nestjs/common';
import { Query } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, AddressesArray, ChainsArray, Logger, NftProjectEnum } from '@app/common';
import { NftAssetsQueryDto, NftProjectResponseDto } from '@app/common/dto/nft';
import { NftResponseDto } from '@app/common/dto/nft/nft.response.dto';
import {
  NftAssetsByAccounts,
  NftAssetsParams,
  NftServiceInfo,
} from '@app/common/interfaces/nft.interface';

import { NftService } from './nft.service';

@ApiTags('Nft')
@Controller('nft')
export class NftController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly nftService: NftService,
  ) {}

  @ApiResponse({ status: HttpStatus.OK, type: [NftProjectResponseDto] })
  @Get('projects')
  public getProjects(): NftServiceInfo[] {
    try {
      return this.nftService.getProjects();
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  @ApiResponse({ status: HttpStatus.OK, type: NftResponseDto })
  @ApiParam({ enum: NftProjectEnum, name: 'projectName' })
  @ApiQuery({ type: NftAssetsQueryDto })
  @Get('assets/:projectName')
  public async getAssets(
    @Param() { projectName }: NftAssetsParams,
    @AddressesArray('addresses') addresses: Address[],
    @ChainsArray('chains') chains: number[],
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<NftAssetsByAccounts> {
    if (!Object.values(NftProjectEnum).includes(projectName)) {
      throw new NotImplementedException(`NFT project ${projectName} is not supported yet`);
    }

    return await this.nftService.getAssets(projectName, addresses, chains, limit, offset);
  }
}
