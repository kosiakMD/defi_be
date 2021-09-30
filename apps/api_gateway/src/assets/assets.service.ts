import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { Address, Chains, DetailedResponse } from '../common/interfaces';

import { AccountService } from '../account/account.service';
import { AssetResponseDto, AssetsDto } from './assets.dto';

@Injectable()
export class AssetsService {
  constructor(
    private accountService: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  async getAllAssets(): Promise<AssetsDto[]> {
    try {
      return await this.accountService.getAssets();
    } catch (e) {
      this.logger.error(e, 'AssetsService.getAllAssets');
      throw e;
    }
  }

  async getAssetsByAddressesAndChains(
    addresses: Address[],
    chains: Chains,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    try {
      return await this.accountService.getAssetsByAddressesAndChains(addresses, chains);
    } catch (e) {
      this.logger.error(e, 'AssetsService.getAssetsByAddressesAndChains');
      throw e;
    }
  }
}
