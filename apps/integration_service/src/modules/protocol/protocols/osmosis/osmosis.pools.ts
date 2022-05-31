import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import {
  ChainDto,
  Address,
  FeatureEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  BalancesResponse,
} from '@app/common';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservice/account.service';

@Injectable()
export class OsmosisPools {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto, protocol: string): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${protocol}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const pools = new Map<string, LiquidityPoolFeature>(
      cachedPools.items.map((item) => [item.address, item]),
    );

    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addresses,
      [chain.id],
      Array.from(pools.keys()),
    );

    const baseDataPoolsMap: Map<string, BaseDataLp> = new Map<string, BaseDataLp>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataLp, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.amm,
          projectName: ProjectEnum.osmosis,
          items: [],
          feature: FeatureEnum.pools,
        }),
      ]),
    );

    for (const address of addresses) {
      if (!Array.isArray(lpBalances[address].tokens)) continue;
      for (const lpToken of lpBalances[address].tokens) {
        if (!pools.has(lpToken.token.address)) continue;

        const poolPosition = pools.get(lpToken.token.address);

        poolPosition.stats.share = lpToken.decimalsAmount / poolPosition.lpToken.totalSupply;

        for (const token of poolPosition.tokens) {
          token.balance = token.reserve * poolPosition.stats.share;
          token.value = token.balance * token.price;
        }
        baseDataPoolsMap.get(address).items.push(poolPosition);
      }
    }

    return Array.from(baseDataPoolsMap.values());
  }
}
