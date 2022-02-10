import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  AccountBalance,
  BalancesResponse,
  FeatureEnum,
  Logger,
  ProtocolTypeEnum,
  TokenBalance,
} from '@app/common';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';

import { BaseData } from '../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../microservices/account.service';

@Injectable()
export class LiquidityPools {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
  ) {}

  public async getData({ addresses, protocolName, projectName, chain }): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${protocolName}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addresses,
      [chain.id],
      cachedPools.items.map((i) => i.lpToken.address),
    );
    const baseData: BaseDataLp[] = [];
    addresses.forEach((a) => {
      const toAdd: BaseDataLp = plainToClass(BaseDataLp, {
        chain: chain,
        userAddress: a,
        protocolType: ProtocolTypeEnum.amm,
        projectName: projectName,
        items: this.toLp(lpBalances[a], cachedPools.items),
        feature: FeatureEnum.pools,
      });
      baseData.push(toAdd);
    });

    return baseData;
  }

  private toLp(
    lpBalance: AccountBalance,
    cachedPools: LiquidityPoolFeature[],
  ): LiquidityPoolFeature[] {
    const cachedPoolsMap: Map<string, any> = new Map<string, any>(
      cachedPools.map((i) => [i.lpToken.address, i]),
    );

    const liquidityPositions = [];
    lpBalance.tokens.forEach((tb) => {
      if (tb.decimalsAmount > 0) {
        liquidityPositions.push(this.toPosition(tb, cachedPoolsMap.get(tb.token.address)));
      }
    });
    return liquidityPositions;
  }

  private toPosition(balance: TokenBalance, poolData: LiquidityPoolFeature): LiquidityPoolFeature {
    const poolShare = new BigNumber(balance.decimalsAmount).div(
      new BigNumber(poolData.lpToken.totalSupply),
    );

    // simple rewriting pool data with user data, prices will be added later if no price here
    const userData = poolData;
    userData.tokens.forEach((t) => {
      const b = new BigNumber(t.reserve).times(poolShare);
      t.balance = b.toNumber();
      t.value = t.balance * t.price;
    });
    userData.stats.share = poolShare.toNumber();
    userData.rewards = undefined;
    return userData;
  }
}
