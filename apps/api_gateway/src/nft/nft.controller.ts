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

import { AccountService } from '../account/account.service';

@ApiTags('Nft')
@Controller('nft')
export class NftController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
  ) {}

  @ApiResponse({ status: HttpStatus.OK, type: [NftProjectResponseDto] })
  @Get('projects')
  public async getProjects(): Promise<NftServiceInfo[]> {
    try {
      return await this.accountService.getNftProjects();
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  @ApiResponse({ status: HttpStatus.OK, type: NftResponseDto })
  @ApiParam({ enum: NftProjectEnum, name: 'projectName' })
  @ApiQuery({ type: NftAssetsQueryDto })
  @Get('assets/:projectName')
  public async getAssetsByProject(
    @Param() { projectName }: NftAssetsParams,
    @AddressesArray('addresses') addresses: Address[],
    @ChainsArray('chains') chains: number[],
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<NftAssetsByAccounts> {
    try {
      if (!Object.values(NftProjectEnum).includes(projectName)) {
        throw new NotImplementedException(`NFT project ${projectName} is not supported yet`);
      }
      return await this.accountService.getNftAssets(projectName, addresses, chains, limit, offset);
    } catch (e) {
      this.logger.error(e);
      return e;
    }
  }
}
