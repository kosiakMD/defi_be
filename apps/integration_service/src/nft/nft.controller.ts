import { Controller, Get, HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, AddressesArray, Logger } from '@app/common';
import { AssetsQueryDto } from '@app/common/dto/nft';
import { AssetsResponseDto } from '@app/common/dto/nft/assets.response.dto';

import { NftService } from './nft.service';

@ApiTags('Nft')
@Controller('nft')
export class NftController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly nftService: NftService,
  ) {}

  @ApiResponse({ status: HttpStatus.OK, type: AssetsResponseDto })
  @ApiQuery({ type: AssetsQueryDto })
  @Get('assets')
  public async getAssets(@AddressesArray('addresses') addresses: Address[]): Promise<any> {
    try {
      return await this.nftService.getAssets(addresses);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
