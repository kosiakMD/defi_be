import axios from 'axios';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, ChainNameEnum, Logger } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult, IconSource } from '../core/asset.analyser';

@Injectable()
export class TrustWalletAssetAnalyser implements AssetAnalyser {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  canAnalyseAsset() {
    return true;
  }

  async analyseAsset({ chainId, address }: AssetReference): Promise<AssetAnalysisResult> {
    const trustWalletChain = this.getTrustWalletChain(chainId);
    if (!trustWalletChain) {
      return;
    }

    const url = `https://assets-cdn.trustwallet.com/blockchains/${trustWalletChain}/assets/${address}/logo.png`;
    if (!(await this.urlExists(url))) {
      return;
    }

    return {
      icons: [
        {
          source: IconSource.trustWallet,
          url,
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

  private async urlExists(url: string): Promise<boolean> {
    try {
      await firstValueFrom(this.httpService.head(url));
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response.status !== HttpStatus.NOT_FOUND) {
          return false;
        }
      }
      throw e;
    }
    return true;
  }
}
