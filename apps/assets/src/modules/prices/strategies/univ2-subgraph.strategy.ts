import { doWhilst } from 'async';
import BigNumber from 'bignumber.js';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address } from '@app/common';
import { COIN_ADDRESS } from '@app/common/constant';
import { delay } from '@app/common/helpers/delay';
import { gql } from '@app/common/utils';

import { areStringEqualsIgnoreCase } from '../../assets/utils/strings';
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
  errors?: [
    {
      message: string;
    },
  ];
};

type Config = {
  subgraphUrl: string;
  chainId: number;
  coinSymbol?: string;
  tradeVolumeUSD?: string;
  tradeVolumeUSDMin?: number;
  maxItems?: number;
  chunkSize?: number;
  requestDelay?: number;
  priceAlias?: string;
  derivedAlias?: string;
  ignoreCoin?: boolean;
  wrappedCoin?: Address;
};

export class Univ2SubgraphStrategy extends BaseStrategy<Config> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  public async fetchPrices(priceSource: PriceSource<Config>): Promise<AssetPrice[]> {
    const {
      wrappedCoin,
      maxItems = 5000,
      chunkSize = 1000,
      requestDelay = 1000,
    } = priceSource.config;

    let prices: AssetPrice[] = [];

    try {
      let skip = 0;
      await doWhilst(
        async () => this.getChunkPrices(priceSource, chunkSize, skip),
        async (chunkPrices) => {
          await delay(requestDelay);
          prices = prices.concat(chunkPrices);
          skip += chunkPrices.length;
          return skip < maxItems && chunkPrices.length;
        },
      );
    } catch (e) {
      this.logger.error(
        `Failed load prices from UniSwap like Subgraph. Source: ${priceSource.sourceId}`,
        e,
      );
      // NOTE: If some prices loaded, return them
      if (!prices.length) {
        throw e;
      }
    }

    if (wrappedCoin) {
      const wrappedCoinEntry = prices.find(({ address }) =>
        areStringEqualsIgnoreCase(address, wrappedCoin),
      );
      if (wrappedCoinEntry && wrappedCoinEntry.price) {
        prices.push({
          ...wrappedCoinEntry,
          address: COIN_ADDRESS,
        });
      }
    }

    return prices;
  }

  private async getChunkPrices(priceSource: PriceSource<Config>, chunkSize: number, skip: number) {
    const { sourceId, config } = priceSource;
    const {
      chainId,
      subgraphUrl,
      coinSymbol = 'ETH',
      tradeVolumeUSD = 'tradeVolumeUSD',
      tradeVolumeUSDMin = 2000,
      ignoreCoin = false,
    } = config;
    const priceAlias = config.priceAlias || `${coinSymbol.toLowerCase()}Price`;
    const derivedAlias = config.derivedAlias || `derived${coinSymbol}`;

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.post<TheGraphResponse>(
          subgraphUrl,
          {
            query: gql`
          query GetPrices($first: Int, $skip: Int) {
            bundles {
              price: ${priceAlias}
            }
            tokens (
              first: $first,
              skip: $skip,
              orderBy: ${tradeVolumeUSD},
              orderDirection: desc
              where: { ${tradeVolumeUSD}_gt: "${tradeVolumeUSDMin}" }
            ) {
              id
              name
              derived: ${derivedAlias}
            }
          }
        `,
            variables: { skip, first: chunkSize },
          },
          { timeout: 30 * 1000 },
        ),
      );
    } catch (e) {
      if (e.message.indexOf('timeout') >= 0) {
        //sometimes subgraph doesn't respond in time
        //to keep already retrieved items we just abort requests to the subgraph
        //next time it may change, and we can retrieve all items then
        this.logger.warn(`request error: [${e.message}]`);
        return [];
      }
      throw e;
    }
    const {
      data: { data, errors },
    } = response;
    if (errors && errors.length) {
      throw Error(errors.map((e) => e.message).join('; '));
    }
    const {
      tokens,
      bundles: [bundle],
    } = data;

    const baseDerived = new BigNumber(bundle?.price);
    const prices = tokens.map((token) => this.parseToken(sourceId, chainId, token, baseDerived));

    if (!ignoreCoin && skip === 0) {
      const coinPrice: AssetPrice = {
        sourceId,
        chainId,
        address: COIN_ADDRESS,
        price: Number(baseDerived),
      };
      prices.push(coinPrice);
    }

    return prices;
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
