import { PriceSourceConfig } from 'apps/assets_service/src/common/types/PriceSourceConfig.type';
import axios, { AxiosRequestConfig } from 'axios';
import BigNumber from 'bignumber.js';

import { delay } from '@app/common/helpers/delay';

import { AssetPrice } from '../types/AssetPrice.type';
import { PriceJobData } from '../types/PriceJobData.type';
import { PriceStrategy } from './strategy';

type TheGraphToken = {
  id: string;
  name: string;
  derived: string;
};

export class TheGraphStrategy extends PriceStrategy {
  private parseToken(
    priceJobData: PriceJobData,
    token: TheGraphToken,
    tokenPrice: string,
  ): AssetPrice {
    const {
      config: { chainId },
      sourceId,
    } = priceJobData;
    const { derived, id: address } = token;
    const price = parseFloat(
      new BigNumber(tokenPrice) //
        .multipliedBy(new BigNumber(derived))
        .toString(),
    );
    return {
      address,
      chainId,
      price,
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
    const {
      config,
      config: { chainId, requestDelay },
    } = priceJobData;
    const requests = await this.createPriceRequests(config);
    const responses = [];
    this.logger.log(`Processing ${requests.length} TheGraph(chainId:${chainId}) requests`);
    if (requestDelay) {
      for await (const request of requests) {
        try {
          const result = await axios.request(request);
          responses.push(result);
          this.logger.log(
            `TheGraph(chainId:${chainId}) request ${request.url} done, got prices num: ${
              Object.keys(result.data).length
            }`,
          );
        } catch (error) {
          this.logger.error(`Error to get TheGraph(chainId:${chainId}) prices on ${request.url}`);
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
