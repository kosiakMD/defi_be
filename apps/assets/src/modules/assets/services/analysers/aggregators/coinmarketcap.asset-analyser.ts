import axios from 'axios';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId } from '@app/common';
import { CoinSymbols, isZeroAddress, retry } from '@app/common/utils';

import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class CoinmarketcapAssetAnalyser implements AssetAnalyser {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  canAnalyseAsset() {
    return true;
  }

  async analyseAsset({ chainId, address }: AssetReference): Promise<AssetAnalysisResult> {
    const response = await retry(() => this.searchCmcAsset(chainId, address));
    if (!response) {
      return;
    }

    const { data } = response;
    if (!data || !Object.keys(data || {}).length) {
      return;
    }

    const firstEntryKey = Object.keys(data)[0];
    const firstEntry = data[firstEntryKey];
    const coinmarketcapCoin = isZeroAddress(address) ? firstEntry[0] : firstEntry;

    const { id, name, symbol, logo, category } = coinmarketcapCoin as CoinmarketcapAsset;

    const categories: AssetCategory[] = [];

    if (category === 'coin') {
      categories.push(AssetCategory.NativeCoin);
    }

    return {
      name,
      symbol,
      isTracked: true,
      categories,
      icons: logo ? [{ source: 'coinmarketcap', url: logo }] : [],
      metadata: {
        coinmarketcapId: id.toString(),
      },
    };
  }

  private async searchCmcAsset(chainId: ChainId, address: Address): Promise<CoinmarketcapResponse> {
    const apiKey = this.config.get('COINMARKETCAP_API_KEY');
    if (!apiKey) {
      throw new Error('Coinmarketcap API key not provided');
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CoinmarketcapResponse>(
          'https://pro-api.coinmarketcap.com/v2/cryptocurrency/info',
          {
            // NOTE: For coins try to find by symbol not by address
            params: isZeroAddress(address) ? { symbol: CoinSymbols[chainId] } : { address },
            headers: {
              ['X-CMC_PRO_API_KEY']: apiKey,
            },
          },
        ),
      );
      return data;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response.status === HttpStatus.BAD_REQUEST) {
          return null;
        }
      }
      throw e;
    }
  }
}

type CoinmarketcapAsset = {
  id: number;
  name?: string;
  symbol?: string;
  category?: string;
  tags?: string[];
  logo?: string;
};

type CoinmarketcapResponse = {
  data: { [key: string]: CoinmarketcapAsset | CoinmarketcapAsset[] };
};
