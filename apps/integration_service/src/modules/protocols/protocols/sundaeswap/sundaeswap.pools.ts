import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import {
  ChainDto,
  Address,
  FeatureEnum,
  BalancesResponse,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { SundaeSwapSubgraph } from '../../../subgraphs/subgraphs/sundaeswap.subgraph';
import { Pool } from './sundaeswap.interface';
import { calculatePoolShare, getPoolAddresseAmount, mapTokens } from './sundaeswap.utils';

@Injectable()
export class SundaeSwapPools {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly sundaeSwapSubgraph: SundaeSwapSubgraph,
  ) {}

  public async getData(
    addresses: Address[],
    chain: ChainDto,
    protocol: string,
  ): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${protocol}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const baseDataPoolsMap: Map<string, BaseDataLp> = new Map<string, BaseDataLp>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataLp, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.amm,
          projectName: ProjectEnum.sundaeswap,
          items: [],
          feature: FeatureEnum.pools,
        }),
      ]),
    );

    const pools = new Map<string, LiquidityPoolFeature>(
      cachedPools.items.map((item) => [item.address, item]),
    );

    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addresses,
      [chain.id],
      Array.from(pools.keys()),
    );

    for (const address of addresses) {
      const avaliblePoolAddresses = getPoolAddresseAmount(
        [address],
        lpBalances,
        Array.from(pools.keys()),
      );

      const accountsPools: Pool[] = await this.sundaeSwapSubgraph.getAccountPools(
        Array.from(avaliblePoolAddresses.keys()),
      );

      for (const pool of accountsPools) {
        const poolPosition = pools.get(pool.assetLP.assetId);

        poolPosition.stats.feeRate = +pool.fee;
        poolPosition.stats.share = calculatePoolShare(avaliblePoolAddresses, poolPosition);

        poolPosition.tokens = mapTokens(poolPosition, pool);

        baseDataPoolsMap.get(address).items.push(poolPosition);
      }
    }

    return Array.from(baseDataPoolsMap.values());
  }
}
