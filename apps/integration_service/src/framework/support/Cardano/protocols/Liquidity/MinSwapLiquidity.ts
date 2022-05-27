import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IPoolFeatureEntryMinimal,
  IPoolFeatureEntryOpportunity,
  IPoolFeatureEntryUserEntry,
} from '../../../interfaces/feature.pool.interface';
import { CardanoCore } from '../../CardanoCore';
import { AVAILABLE_POOLS_QUERY } from '../gql/MinSwap.gql';

export interface MinSwapLiquidityMeta extends IProtocolMeta {
  name: string;
  feature: FeatureEnum.pools;
  context: {
    endpoint: string;
  };
}

export class MinSwapLiquidity
  extends CardanoCore<
    IPoolFeatureEntryMinimal,
    IPoolFeatureEntryOpportunity,
    IPoolFeatureEntryUserEntry,
    MinSwapLiquidityMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<IPoolFeatureEntryMinimal[]> {
    const rowOpportunities = await this.getCacheableOpportunityRawData();

    return rowOpportunities.map(this.toCacheableOpportunityMinimal.bind(this));
  }

  async getUsersData(): Promise<{
    data: Map<string, IPoolFeatureEntryUserEntry[]>;
    errors: Error[];
  }> {
    const { data: pools, errors } = await this.getPoolData();
    throw new Error('Method not implemented.');
  }

  private async getCacheableOpportunityRawData() {
    let hasMorePool = true;
    let offset = 0;
    const limit = 20;
    const availablePools = [];

    do {
      const $data = this.httpService.post(
        this.meta.context.endpoint,
        {
          query: AVAILABLE_POOLS_QUERY,
          variables: { limit: limit, offset: offset, asset: '' },
        },
        {
          headers: { origin: 'https://defiyield.app' },
        },
      );
      offset += limit;
      const { data: pools } = await firstValueFrom($data);
      hasMorePool = pools.data.topPools.length < 20;
      availablePools.push(pools.data.topPools);
    } while (!hasMorePool);

    return availablePools.flat();
  }

  private toCacheableOpportunityMinimal(pool: any): IPoolFeatureEntryMinimal {
    const assetAddressA = pool.assetA.currencySymbol
      ? [pool.assetA.currencySymbol, pool.assetA.tokenName].join('.')
      : CARDANO_COIN_ADDRESS;
    const assetAddressB = [pool.assetB.currencySymbol, pool.assetB.tokenName].join('.');
    const lpAddress = [pool.lpAsset.currencySymbol, pool.lpAsset.tokenName].join('.');
    return {
      id: lpAddress,
      chain: this.meta.chain,
      feature: this.meta.feature,
      token: {
        token: {
          address: lpAddress,
        },
        totalSupplied: pool.totalLiquidity.toString(),
      },
      supplied: [
        {
          token: { address: assetAddressA },
          totalSupplied: pool.reserveA.toString(),
        },
        {
          token: { address: assetAddressB },
          totalSupplied: pool.reserveB.toString(),
        },
      ],
      rewarded: [],
    };
  }
}
