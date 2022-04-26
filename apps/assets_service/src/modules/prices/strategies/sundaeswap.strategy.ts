import { PriceSourceConfig } from 'apps/assets_service/src/common/types/PriceSourceConfig.type';
import axios, { AxiosRequestConfig } from 'axios';
import BigNumber from 'bignumber.js';

import { AssetPrice } from '../types/AssetPrice.type';
import { PriceJobData } from '../types/PriceJobData.type';
import { PriceStrategy } from './strategy';

type SundaeswapToken = {
  assetB: {
    assetId: string;
    policyId: string;
    assetName: string;
    decimals: number;
    ticker: string;
  };
  assetID: string;
  priceUSD: string;
};

export class SundaeswapStrategy extends PriceStrategy {
  private parseToken(priceJobData: PriceJobData, token: SundaeswapToken): AssetPrice | boolean {
    const {
      config: { chainId },
      sourceId,
    } = priceJobData;
    const {
      assetB: { assetId: address, decimals },
      priceUSD,
    } = token;
    return decimals !== null
      ? {
          address,
          chainId,
          priceInUsd: new BigNumber(priceUSD).toNumber(),
          sourceId,
        }
      : false;
  }

  public createPriceRequests(config: PriceSourceConfig): Promise<AxiosRequestConfig[]> {
    const priceRequests: AxiosRequestConfig[] = [];
    const { maxItems, baseURL, path, take, gqlString: query } = config;
    let skipItems = 0;
    while (skipItems < maxItems) {
      priceRequests.push({
        method: 'POST',
        url: `${baseURL}${path}`,
        data: {
          query,
          variables: { pageSize: maxItems },
        },
      });
      skipItems += take;
    }
    return new Promise((ok) => ok(priceRequests));
  }

  public async fetchPrices(priceJobData: PriceJobData): Promise<AssetPrice[]> {
    const assetPrices: AssetPrice[] = [];
    const { config } = priceJobData;
    const requests = await this.createPriceRequests(config);
    const responses = await Promise.all(requests.map((request) => axios.request(request)));
    for (const response of responses) {
      try {
        const {
          data: {
            data: { poolsPopular },
          },
        } = response;
        assetPrices.push(
          poolsPopular //
            .map((token: SundaeswapToken) => this.parseToken(priceJobData, token))
            .filter((assetPrice: AssetPrice | boolean) => !!assetPrice),
        );
      } catch (error) {
        this.handleFailResponse(error);
      }
    }
    return assetPrices.flat();
  }
}
