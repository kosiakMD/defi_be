import { PriceSourceConfig } from 'apps/assets_service/src/common/types/PriceSourceConfig.type';
import axios, { AxiosRequestConfig } from 'axios';
import BigNumber from 'bignumber.js';

import { delay } from '@app/common/helpers/delay';

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
          price: new BigNumber(priceUSD).toNumber(),
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
    const {
      config,
      config: { requestDelay },
    } = priceJobData;
    const requests = await this.createPriceRequests(config);
    const responses = [];
    this.logger.log(`Processing ${requests.length} Sundaeswap requests`);
    if (requestDelay) {
      for await (const request of requests) {
        try {
          const result = await axios.request(request);
          responses.push(result);
          this.logger.log(
            `Sandauswap request ${request.url} done, got prices num: ${
              Object.keys(result.data).length
            }`,
          );
        } catch (error) {
          this.logger.error(`Error to get Sandaeswap prices on ${request.url}`);
          this.logger.error(error);
        }
        await delay(requestDelay * 1000);
      }
    } else {
      responses.push(await Promise.all(requests.map((req) => axios.request(req))));
    }
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
