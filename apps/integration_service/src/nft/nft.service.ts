import { Injectable } from '@nestjs/common';

import { Address } from '@app/common';

import { OpenSeaService } from '../open_sea/open.sea.service';

@Injectable()
export class NftService {
  constructor(private readonly openSeaService: OpenSeaService) {}

  public async getAssets(addresses: Address[]) {
    try {
      const openSeaAssets = await this.openSeaService.getAssetsByAccounts(addresses);

      return openSeaAssets;
    } catch (e) {
      throw new Error(e);
    }
  }
}
