import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, ChainNameEnum } from '@app/common';

import { AssetIcon, AssetReference } from '../types';
import { IconStrategy } from './icon-strategy';

export class TrustWalletStrategy extends IconStrategy<void> {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {
    super();
  }

  loadIcons({ chainId, address }: AssetReference): AssetIcon[] {
    const trustWalletChain = this.getTrustWalletChain(chainId);
    if (!trustWalletChain) {
      return [];
    }

    return [
      {
        url: `https://assets-cdn.trustwallet.com/blockchains/${trustWalletChain}/assets/${address}/logo.png`,
      },
    ];
  }

  private getTrustWalletChain(chainId: number): string {
    switch (chainId) {
      case ChainIdEnum.bnb:
        return 'smartchain';
      case ChainIdEnum.avax:
        return 'avalanchec';
      case ChainIdEnum.kcc:
        return 'kcc';
      default:
        // NOTE: Most chains are just mapped to chain name
        // So we only override once that are not matching
        return ChainNameEnum[ChainIdEnum[chainId]];
    }
  }
}
