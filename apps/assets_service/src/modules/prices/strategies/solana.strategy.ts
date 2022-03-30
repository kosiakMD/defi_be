import { PriceSourceConfig } from 'apps/assets_service/src/common/types/PriceSourceConfig.type';
import axios, { AxiosRequestConfig } from 'axios';

import { ChainIdEnum } from '@app/common/enum';
import { ChainCoinAddresses } from '@app/common/utils/chains';

import { AssetPrice } from '../types/AssetPrice.type';
import { PriceJobData } from '../types/PriceJobData.type';
import { PriceStrategy } from './strategy';

// TO_CHECK all Solana strategy
type SolanaToken = {
  mintAddress: string;
  priceUst: number;
};

export class SolanaStrategy extends PriceStrategy {
  public async createPriceRequests(config: PriceSourceConfig): Promise<AxiosRequestConfig[]> {
    const priceRequests = [];
    const { baseURL, maxItems, path, take } = config;
    let skip = 0;
    while (skip < maxItems) {
      const url =
        baseURL +
        path //
          .replace('$take', take.toString())
          .replace('$skip', skip.toString());
      priceRequests.push({
        url,
        method: 'GET',
      });
      skip += take;
    }
    return priceRequests;
  }
  public async fetchPrices(priceJobData: PriceJobData): Promise<AssetPrice[]> {
    const assetPrices: AssetPrice[] = [];
    const {
      config,
      config: { chainId },
      sourceId,
    } = priceJobData;
    const requests = await this.createPriceRequests(config);
    const responses = await Promise.all(requests.map((request) => axios.request(request)));
    for (const response of responses) {
      try {
        const {
          data: { data },
        } = response;
        assetPrices.push(
          data.map((token: SolanaToken) => ({
            address:
              token.mintAddress === 'So11111111111111111111111111111111111111112'
                ? ChainCoinAddresses[ChainIdEnum.sol]
                : token.mintAddress,
            chainId,
            sourceId,
            priceInUsd: token.priceUst,
          })),
        );
      } catch (error) {
        this.handleFailResponse(error);
      }
    }
    return assetPrices.flat();
  }
}
