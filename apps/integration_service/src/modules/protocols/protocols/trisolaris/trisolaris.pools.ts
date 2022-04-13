import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  AccountBalance,
  Address,
  BalancesResponse,
  ChainDto,
  ChainIdEnum,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
  TokenBalance,
  TrisolarisProtocolEnum,
} from '@app/common';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';

@Injectable()
export class TrisolarisPools {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${TrisolarisProtocolEnum.trisolaris}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addresses,
      [ChainIdEnum.near],
      cachedPools.items.map((i) => i.address),
    );

    const baseData: BaseDataLp[] = [];
    addresses.forEach((a) => {
      const existedPositions = this.toLp(lpBalances[a], cachedPools.items);
      if (existedPositions.length > 0) {
        const toAdd: BaseDataLp = plainToClass(BaseDataLp, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.trisolaris,
          items: existedPositions,
          feature: FeatureEnum.pools,
        });
        baseData.push(toAdd);
      }
    });

    return baseData;
  }

  private toLp(
    lpBalance: AccountBalance,
    cachedPools: LiquidityPoolFeature[],
  ): LiquidityPoolFeature[] {
    const cachedPoolsMap: Map<string, any> = new Map<string, any>(
      cachedPools.map((i) => [i.address, i]),
    );

    return lpBalance.tokens.map((tb) => {
      if (tb.decimalsAmount > 0) {
        return this.toPosition(tb, cachedPoolsMap.get(tb.token.address));
      }
    });
  }

  private toPosition(balance: TokenBalance, poolData: LiquidityPoolFeature): LiquidityPoolFeature {
    const poolShare = new BigNumber(balance.decimalsAmount).div(
      new BigNumber(poolData.lpToken.totalSupply),
    );

    poolData.tokens.forEach((t) => {
      const b = new BigNumber(t.reserve) //
        .times(poolShare)
        .toNumber();
      t.value = null;
      t.price = null;
      t.balance = b;
    });
    poolData.stats.share = poolShare.toNumber();
    return poolData;
  }
}
