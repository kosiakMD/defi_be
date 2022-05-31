import BigNumber from 'bignumber.js';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';
import { gql } from '@app/common/utils';

import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';
import { BaseStrategy } from './base.strategy';

type SundaeSwapResponse = {
  data: {
    poolsPopular: SundaeSwapPool[];
  };
};

type SundaeSwapPool = {
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

type Config = {
  maxItems?: number;
};

export class SundaeSwapStrategy extends BaseStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  public async fetchPrices({ sourceId, config }: PriceSource<Config>): Promise<AssetPrice[]> {
    const { maxItems = 500 } = config;

    const {
      data: {
        data: { poolsPopular },
      },
    } = await firstValueFrom(
      this.httpService.post<SundaeSwapResponse>('https://stats.sundaeswap.finance/graphql', {
        query: gql`
          query getPopularPools($pageSize: Int) {
            poolsPopular(pageSize: $pageSize) {
              ...ExtendPoolFragment
            }
          }
          fragment ExtendPoolFragment on Pool {
            ...PoolFragment
            ...PoolInfoFragment
          }
          fragment PoolFragment on Pool {
            assetB {
              ...AssetFragment
            }
            assetID
          }
          fragment AssetFragment on Asset {
            assetId
            policyId
            assetName
            decimals
            ticker
          }
          fragment PoolInfoFragment on Pool {
            priceUSD
          }
        `,
        variables: { pageSize: maxItems },
      }),
    );

    return poolsPopular //
      .map((token) => this.parseToken(sourceId, token))
      .filter((price) => !!price);
  }

  private parseToken(sourceId: number, token: SundaeSwapPool): AssetPrice | null {
    const {
      assetB: { assetId: address, decimals },
      priceUSD,
    } = token;

    if (decimals === null || decimals === undefined) {
      return null;
    }

    return {
      address,
      chainId: ChainIdEnum.cardano,
      price: new BigNumber(priceUSD).toNumber(),
      sourceId,
    };
  }
}
