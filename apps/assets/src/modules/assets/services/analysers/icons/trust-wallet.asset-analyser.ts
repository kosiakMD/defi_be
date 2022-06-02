import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, ChainNameEnum } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class TrustWalletAssetAnalyser implements AssetAnalyser {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  canAnalyseAsset() {
    return true;
  }

  analyseAsset({ chainId, address }: AssetReference): AssetAnalysisResult {
    const trustWalletChain = this.getTrustWalletChain(chainId);
    if (!trustWalletChain) {
      return;
    }

    return {
      icons: [
        {
          source: 'trust-wallet',
          url: `https://assets-cdn.trustwallet.com/blockchains/${trustWalletChain}/assets/${address}/logo.png`,
        },
      ],
    };
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
