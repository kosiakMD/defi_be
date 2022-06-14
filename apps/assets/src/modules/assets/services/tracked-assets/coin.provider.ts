import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS, COIN_ADDRESS, SOL_COIN_ADDRESS } from '@app/common/constant';
import { isEVMChain } from '@app/common/utils';

import { ChainService } from '../../../../common/services/chain.service';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class CoinProvider implements TrackedAssetsProvider {
  constructor(private readonly chainService: ChainService) {}

  name(): string {
    return 'Coin';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const chains = await this.chainService.getChains();
    return chains
      .filter(({ id }) => isEVMChain(id))
      .map(({ id }) => ({ chainId: id, address: COIN_ADDRESS, isTracked: true }))
      .concat([
        {
          chainId: ChainIdEnum.sol,
          address: SOL_COIN_ADDRESS,
          isTracked: true,
        },
        {
          chainId: ChainIdEnum.cardano,
          address: CARDANO_COIN_ADDRESS,
          isTracked: true,
        },
      ]);
  }
}
