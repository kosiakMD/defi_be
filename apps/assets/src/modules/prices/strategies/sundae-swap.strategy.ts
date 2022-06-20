import BigNumber from 'bignumber.js';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { gql, normalizeDecimals } from '@app/common/utils';

import { PriceService } from '../price.service';
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
    decimals: number;
  };
  quantityA: string;
  quantityB: string;
  assetID: string;
};

type Config = {
  maxItems?: number;
};

export class SundaeSwapStrategy extends BaseStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly priceService: PriceService,
  ) {
    super();
  }

  public async fetchPrices({ sourceId, config }: PriceSource<Config>): Promise<AssetPrice[]> {
    const { maxItems = 1000 } = config;
    const [ADAprice] = await this.priceService.getPrices([
      { address: CARDANO_COIN_ADDRESS, chainId: ChainIdEnum.cardano },
    ]);

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
          }
          fragment PoolFragment on Pool {
            assetB {
              ...AssetFragment
            }
            assetID
            quantityA
            quantityB
          }
          fragment AssetFragment on Asset {
            assetId
            decimals
          }
        `,
        variables: { pageSize: maxItems },
      }),
    );

    return poolsPopular //
      .map((token) => this.parseToken(sourceId, token, ADAprice.price))
      .filter((price) => !!price);
  }

  private parseToken(sourceId: number, token: SundaeSwapPool, ADAprice: number): AssetPrice | null {
    const {
      assetB: { assetId: address, decimals },
      quantityA,
      quantityB,
    } = token;

    if (decimals === null || decimals === undefined) {
      return null;
    }

    return {
      address,
      chainId: ChainIdEnum.cardano,
      price: new BigNumber(normalizeDecimals(quantityA, 6)) //
        .div(normalizeDecimals(quantityB, decimals))
        .times(ADAprice)
        .toNumber(),
      sourceId,
    };
  }
}
