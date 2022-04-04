import { PriceSourceConfig } from 'apps/assets_service/src/common/types/PriceSourceConfig.type';
import axios, { AxiosRequestConfig } from 'axios';
import BigNumber from 'bignumber.js';

import { AssetPrice } from '../types/AssetPrice.type';
import { PriceJobData } from '../types/PriceJobData.type';
import { PriceStrategy } from './strategy';

type TheGraphToken = {
  id: string;
  name: string;
  derived: string;
};

export class TheGraphStrategy extends PriceStrategy {
  private parseToken(priceJobData: PriceJobData, token: TheGraphToken, price: string): AssetPrice {
    const {
      config: { chainId },
      sourceId,
    } = priceJobData;
    const { derived, id: address } = token;
    const priceInUsd = parseFloat(
      new BigNumber(price) //
        .multipliedBy(new BigNumber(derived))
        .toString(),
    );
    return {
      address,
      chainId,
      priceInUsd,
      sourceId,
    };
  }

  private createPriceRequests(config: PriceSourceConfig): Promise<AxiosRequestConfig[]> {
    const priceRequests: AxiosRequestConfig[] = [];
    const { maxItems, baseURL, path, take, gqlString: query } = config;
    let skipItems = 0;
    while (skipItems < maxItems) {
      const takeItems = skipItems + take > maxItems ? maxItems - skipItems : take;
      priceRequests.push({
        method: 'POST',
        url: `${baseURL}${path}`,
        data: {
          query,
          variables: { first: takeItems, skip: skipItems },
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
            data: {
              bundles: [{ price }],
              tokens,
            },
          },
        } = response;
        assetPrices.push(
          tokens.map((token: TheGraphToken) => this.parseToken(priceJobData, token, price)),
        );
      } catch (error) {
        this.handleFailResponse(error);
      }
    }
    return assetPrices.flat();
  }
}
