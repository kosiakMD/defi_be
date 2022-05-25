import BigNumber from 'bignumber.js';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { delay } from '@app/common/helpers/delay';
import { gql } from '@app/common/utils';

import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';
import { BaseStrategy } from './base.strategy';

type Token = {
  id: string;
  name: string;
  derived: string;
};

type TheGraphResponse = {
  data: {
    bundles: [
      {
        price: string;
      },
    ];
    tokens: Token[];
  };
};

type Config = {
  subgraphUrl: string;
  chainId: number;
  coinSymbol?: string;
  orderBy?: string;
  maxItems?: number;
  chunkSize?: number;
  requestDelay?: number;
};

export class Univ2SubgraphStrategy extends BaseStrategy<Config> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  public async fetchPrices(priceSource: PriceSource<Config>): Promise<AssetPrice[]> {
    const { maxItems = 2000, chunkSize = 1000, requestDelay = 1000 } = priceSource.config;

    let prices: AssetPrice[] = [];

    let skip = 0;
    while (skip < maxItems) {
      await delay(requestDelay);

      const chunkPrices = await this.getChunkPrices(priceSource, chunkSize, skip);
      prices = prices.concat(chunkPrices);

      skip += chunkSize;
    }

    return prices;
  }

  private async getChunkPrices(priceSource: PriceSource<Config>, chunkSize: number, skip: number) {
    const { sourceId, config } = priceSource;
    const { chainId, subgraphUrl, coinSymbol = 'ETH', orderBy = 'tradeVolumeUSD' } = config;

    const {
      data: {
        data: {
          tokens,
          bundles: [bundle],
        },
      },
    } = await firstValueFrom(
      this.httpService.post<TheGraphResponse>(subgraphUrl, {
        query: gql`
          query GetPrices($first: Int, $skip: Int) {
            bundles {
              price: ${coinSymbol.toLowerCase()}Price
            }
            tokens (
              first: $first,
              skip: $skip,
              orderBy: ${orderBy},
              orderDirection: desc
            ) {
              id
              name
              derived: derived${coinSymbol}
            }
          }
        `,
        variables: { skip, first: chunkSize },
      }),
    );

    const baseDerived = new BigNumber(bundle.price);
    return tokens.map((token) => this.parseToken(sourceId, chainId, token, baseDerived));
  }

  private parseToken(
    sourceId: number,
    chainId: number,
    token: Token,
    baseDerived: BigNumber,
  ): AssetPrice {
    const { derived, id: address } = token;
    return {
      sourceId,
      chainId,
      address,
      price: baseDerived.multipliedBy(new BigNumber(derived)).toNumber(),
    };
  }
}
