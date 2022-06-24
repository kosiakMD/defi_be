import { cloneDeep } from 'lodash';
import { AbiItem } from 'web3-utils';

import { Address } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { SpiritSwapGauge } from '@app/common/web3provider/contracts/protocols/spiritSwap/spiritSwapGauge';

import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { MasterChef } from './MasterChef';

export class SpiritStaking extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    tokens: () => (item) => item.name === 'tokens',
    length: () => (item) => item.name === 'length',
    gauges: () => (item) => item.name === 'gauges',
  };
  interactiveFunctionPredicates: INamedFunctionPredicates = {};
  protected incentivesFunctionsPredicates: INamedFunctionPredicates = {
    balanceOf: () => (item) => item.name === 'balanceOf',
    earned: () => (item) => item.name === 'earned',
    totalSupply: () => (item) => item.name === 'totalSupply',
  };

  private abiQauges: AbiItem[];

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const listPools = context.tokens;

    const calls = listPools.map((p) => {
      return this.getMainContract().createCall(this.functions.gauges, p);
    });
    const registeredTokens = await this.multicall.callArray(calls, this.meta.chain);

    const callsQ = new Map(
      registeredTokens.flatMap((r) => {
        const contract = new SpiritSwapGauge(r);
        return [[this.totalSupplyLabel(r), contract.totalSupply()]];
      }),
    );

    const dataPools = await this.multicall.handleInBatches(callsQ, this.meta.chain);

    return listPools.map((pool, idx) => {
      const dataDerivedSupply = dataPools.get(this.totalSupplyLabel(registeredTokens[idx])).output
        .data;
      return {
        id: registeredTokens[idx],
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: pool.toLowerCase(),
            },
            totalSupplied: dataDerivedSupply.toString(),
          },
        ],
        rewarded: [
          {
            token: { address: context.rewardToken.toLowerCase() },
          },
        ],
      };
    });
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    const calls = new Map(
      pools.flatMap((p) => {
        const contract = new SpiritSwapGauge(p.id);
        return [
          [this.earnedInfoLabel(p.id, address), contract.earned(address)],
          [this.balanceInfoLabel(p.id, address), contract.balanceOf(address)],
        ];
      }),
    );

    const userDataInfo = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools
      .map((p) => {
        return this.formatUserData(address, p, userDataInfo);
      })
      .filter((ub) => !!ub);
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const rewardToken = usersPool.rewarded[0];
    const lpToken = usersPool.supplied[0];

    const userBalance = data.get(this.balanceInfoLabel(usersPool.id, address)).output.data;
    const userReward = data.get(this.earnedInfoLabel(usersPool.id, address)).output.data;

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
    usersPool.supplied[0].token.underlying = usersPool.supplied[0].token.underlying.map((u) => {
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

  totalSupplyLabel(lpToken) {
    return concatStrings(lpToken, this.incentivesFunctionsPredicates.totalSupply.name);
  }

  earnedInfoLabel(poolId, address) {
    return concatStrings(poolId, address, this.incentivesFunctionsPredicates.earned.name);
  }

  balanceInfoLabel(poolId, address) {
    return concatStrings(poolId, address, this.incentivesFunctionsPredicates.balanceOf.name);
  }
}
