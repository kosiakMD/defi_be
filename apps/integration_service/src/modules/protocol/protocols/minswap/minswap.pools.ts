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
import { CardanoService } from '../../helpers/cardano/cardano.service';

@Injectable()
export class MinswapPools {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly cardanoUtils: CardanoService,
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
          projectName: ProjectEnum.minswap,
          items: [],
          feature: FeatureEnum.pools,
        }),
      ]),
    );
    const avaliblePoolAddresses = this.cardanoUtils.getPoolAddressesAmount(
      addresses,
      lpBalances,
      Array.from(pools.keys()),
    );

    for (const address of addresses) {
      if (!avaliblePoolAddresses.has(address)) continue;
      for (const [lpAddress, balance] of avaliblePoolAddresses.get(address)) {
        const pool = pools.get(lpAddress);

        pool.stats.share = this.cardanoUtils.calculatePoolShare(+balance, pool);
        pool.tokens = this.cardanoUtils.mapTokens(pool);

        baseDataPoolsMap.get(address).items.push(pool);
      }
    }

    return Array.from(baseDataPoolsMap.values());
  }
}
