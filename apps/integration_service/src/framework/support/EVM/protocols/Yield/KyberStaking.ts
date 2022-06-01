import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { MasterChef } from './MasterChef';

export class KyberStaking extends MasterChef {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
  ) {
    super(abiService, multicall, logger, cache, accountService, priceService);
  }

  functionPredicates: INamedFunctionPredicates = {
    getPoolInfo: () => (item) => item.name === 'getPoolInfo',
    poolLength: () => (item) => item.name === 'poolLength',
    pendingRewards: () => (item) => item.name === 'pendingRewards',
    getRewardTokens: () => (item) => item.name === 'getRewardTokens',
    rewardTokens: () => (item) => item.name === 'rewardTokens',
    getUserInfo: () => (item) => item.name === 'getUserInfo',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());
    const poolsList = await this.fetchRegisteredPools(poolIds);

    const rewardTokensListCalls = poolIds.map((poolId) =>
      this.getMainContract().createCall(this.functions.rewardTokens, poolId),
    );
    const rewardTokensList = await this.multicall.callArray(rewardTokensListCalls, this.meta.chain);

    return Array.from(poolsList.values()).map((pool: any, idx) => ({
      id: pool.stakeToken.toLowerCase(),
      idPool: idx,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: pool.stakeToken.toLowerCase(),
          },
          totalSupplied: pool.totalStake.toString(),
        },
      ],
      rewarded: [
        {
          token: {
            address: rewardTokensList[idx].toLowerCase(),
          },
        },
      ],
    }));
  }

  protected async fetchRegisteredPools(
    poolIds: number[],
  ): Promise<Map<string, { totalStake: number; stakeToken: string }>> {
    const registeredPoolsCalls = poolIds.map((poolId) =>
      this.getMainContract().createCall(this.functions.getPoolInfo, poolId),
    );
    const registeredPools = await this.multicall.callArray(registeredPoolsCalls, this.meta.chain);
    return new Map(registeredPools.map((t) => [t.stakeToken.toLowerCase(), t]));
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    const calls = new Map(
      pools.flatMap((pool, idx) => [
        [
          this.userInfoLabel(pool.id, address),
          this.getMainContract().createCall(this.functions.getUserInfo, idx, address),
        ],
        [
          this.userRewardLabel(pool.id, address),
          this.getMainContract().createCall(this.functions.pendingRewards, idx, address),
        ],
      ]),
    );

    const userDataInfo = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools
      .map((p) => this.fromatUserData(address, p, userDataInfo))
      .filter((ub) => ub !== undefined);
  }

  protected fromatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const rewardToken = usersPool.rewarded[0];
    const lpToken = usersPool.supplied[0];

    const { amount: userBalance } = data.get(this.userInfoLabel(usersPool.id, address)).output.data;
    const userReward = data.get(this.userRewardLabel(usersPool.id, address)).output.data;

    if (userBalance.toString() === '0') {
      return;
    }

    const balanceNormalized = normalizeDecimals(userBalance.toString(), lpToken.token.decimals);
    const pendingRewardNormalized = normalizeDecimals(
      userReward.toString(),
      rewardToken.token.decimals,
    );
    const poolShare = balanceNormalized / lpToken.token.totalSupply;
    Object.assign(usersPool.supplied[0], {
      amount: balanceNormalized,
      value: balanceNormalized * lpToken.token.price,
    });
    Object.assign(usersPool.rewarded[0], {
      amount: pendingRewardNormalized,
      value: pendingRewardNormalized * rewardToken.token.price,
    });
    usersPool.supplied[0].token.underlying = usersPool.supplied[0].token.underlying?.map((u) => {
      return this.formatUnderlyingTokens(u, poolShare);
    });

    return usersPool as IStakingFeatureUserEntry;
  }

  formatUnderlyingTokens(poolToken: ERC20Token, poolShare: number) {
    const balance = poolToken.reserve * poolShare;
    if (poolToken.underlying) {
      poolToken.underlying = poolToken.underlying.map((pt) => {
        const underlyingPoolShare = poolToken.balance / poolToken.totalSupply;
        return this.formatUnderlyingTokens(pt, underlyingPoolShare);
      });
    }
    return {
      ...poolToken,
      balance: balance,
      value: balance * poolToken.price,
    };
  }

  userRewardLabel(poolId, userAddress): string {
    return concatStrings(poolId, userAddress, this.functions.pendingRewards.name);
  }
  userInfoLabel(poolId, userAddress): string {
    return concatStrings(poolId, userAddress, this.functions.getUserInfo.name);
  }
}
