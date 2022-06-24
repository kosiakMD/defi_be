import { AssetReference } from 'apps/assets/src/common/types';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { hexToString } from '@app/common/utils';

import { AssetAnalyser, AssetAnalysisResult, IconSource } from '../core/asset.analyser';

@Injectable()
export class MuesliSwaIconsAnalyser implements AssetAnalyser {
  private acceptedChains: ChainIdEnum[];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {
    this.acceptedChains = [ChainIdEnum.cardano, ChainIdEnum.milkomeda];
  }

  canAnalyseAsset({ address, chainId }: AssetReference) {
    return this.acceptedChains.includes(chainId) && address !== CARDANO_COIN_ADDRESS;
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    switch (asset.chainId) {
      case ChainIdEnum.cardano:
        return this.cardanoAnalyser(asset);

      case ChainIdEnum.milkomeda:
        return this.milkomedaAnalyser(asset);

      default:
        return;
    }
  }

  private async cardanoAnalyser({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const overbookV2 = {
      source: IconSource.muesliSwapOverbookV2,
      url: this.getOverbookV2Url(address),
    };
    const muesliSwapInternal = {
      source: IconSource.muesliSwapCardano,
      url: this.getCardanoMuesliSwapUrl(address),
    };

    if (await this.urlExists(overbookV2.url)) {
      return {
        icons: [overbookV2],
      };
    }

    if (await this.urlExists(muesliSwapInternal.url)) {
      return {
        icons: [muesliSwapInternal],
      };
    }

    return;
  }

  private async milkomedaAnalyser({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const url = `https://milkomeda.muesliswap.com/images/tokens/${address}.png`;
    if (await this.urlExists(url)) {
      return {
        icons: [
          {
            source: IconSource.muesliSwapMilkomeda,
            url,
          },
        ],
      };
    }

    return;
  }

  private getOverbookV2Url(address: string) {
    return `https://orderbookv2.muesliswap.com/static/img/tokens-hex/${address}.png`;
  }

  private getCardanoMuesliSwapUrl(address: string) {
    return `https://muesliswap.com/images/tokens/${this.addressHexToName(address)}.png`;
  }

  private addressHexToName(address: string) {
    const [, policyId, hexName] = address.match(/^(.+)\.(.+)$/);
    return `${policyId}.${hexToString(hexName)}`;
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
