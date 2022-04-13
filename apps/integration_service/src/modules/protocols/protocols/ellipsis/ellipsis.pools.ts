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
  EllipsisProtocolEnum,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
  TokenBalance,
} from '@app/common';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import EllipsisProtocol from './ellipsis.protocol';

@Injectable()
export class EllipsisPools {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const addressesLowerCase = addresses.map((address) => address.toLowerCase());
    const cacheKey = `${chain.id}_${EllipsisProtocolEnum.ellipsis}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addressesLowerCase,
      [ChainIdEnum.bnb],
      cachedPools.items.map((i) => i.lpToken.address),
    );

    const baseData: BaseDataLp[] = [];
    addressesLowerCase.forEach((a) => {
      const existedPositions = this.toLp(lpBalances[a], cachedPools.items);
      const toAdd: BaseDataLp = plainToClass(BaseDataLp, {
        chain: chain,
        userAddress: a,
        protocolType: ProtocolTypeEnum.amm,
        projectName: ProjectEnum.ellipsis,
        items: existedPositions,
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
    const cachedPoolsMap = new Map<string, LiquidityPoolFeature>(
      cachedPools.map((i) => [i.lpToken.address, i]),
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

    // simple rewriting pool data with user data, prices will be added later
    const userData = poolData;
    userData.tokens.forEach((t) => {
      const b = new BigNumber(t.reserve) //
        .times(poolShare)
        .toNumber();
      t.value = null;
      t.price = null;
      t.balance = b;
    });
    userData.stats.share = poolShare.toNumber();
    userData.stats.feeRate = EllipsisProtocol.feeRate;

    return userData;
  }
}
