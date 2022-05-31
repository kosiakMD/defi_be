import { REWARD_REGEX } from 'apps/categorization_service/src/modules/protocols/services/abi/abi.string.utils';
import BigNumber from 'bignumber.js';

import { Address } from '@app/common';
import { averageBlockTimeByChain } from '@app/common/constant/blocktime';
import { equals, normalizeDecimals, regex, startsWith } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { IMasterChefPoolInfo, MasterChef } from './MasterChef';

export class MasterChefNeureus extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    // first try to get an TOKEN per (block/second) item
    rewardPerSecond: () => (item) =>
      !startsWith(item.name, 'max') && !!regex(item.name, REWARD_REGEX)?.[0],
    // then use the above ABI item, to parse out the probable TOKEN name
    totalAllocPoint: () => (item) => startsWith(item.name, 'totalAlloc'),
    poolInfo: () => (item) => startsWith(item.name, 'poolInf'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => equals(item.name, 'claimableReward'),
    registeredTokens: () => (item) => equals(item.name, 'registeredTokens'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    context.rewardToken = '0xfcde4a87b8b6fa58326bb462882f1778158b02f1';
    context.totalAllocPoint = parseInt(context.totalAllocPoint, 10);

    // convert rewards per block to rewards per second to
    // standardize across chains
    const avgBlockTime = averageBlockTimeByChain[this.meta.chain] || 1;
    if (!averageBlockTimeByChain[this.meta.chain]) {
      this.logger.warn(
        `Missing Average BlockTIme for chain ${this.meta.chain}`,
        this.constructor.name,
      );
    }
    context.rewardPerSecond = new BigNumber(context.rewardPerSecond)
      .dividedBy(avgBlockTime)
      .toString();

    return context;
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();

    const registeredTokens = await this.getRegisteredTokens(pools.map((_, index) => index));

    const claimableRewardsCall = contract.createCall(
      this.functions.pendingRewards,
      address,
      registeredTokens,
    );
    const claimableRewards = await this.multicall.call(claimableRewardsCall, this.meta.chain);

    const calls = new Map();
    pools.forEach((pool, index) => {
      // TODO: include 'meta' object so we can just provide e.g. poolId on masterchefs?
      // This works, but feels like a hack. but how to cleanly allow extra pool metadata
      // without abuse/misuse?
      const [masterchef, poolId] = pool.id.split('::');

      calls.set(
        this.userInfoLabel(masterchef, poolId, address),
        contract.createCall(this.functions.userInfo, registeredTokens[index], address),
      );
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    pools.forEach((pool, index) => {
      // TODO: include 'meta' object so we can just provide e.g. poolId on masterchefs?
      // This works, but feels like a hack. but how to cleanly allow extra pool metadata
      // without abuse/misuse?
      const [masterchef, poolId] = pool.id.split('::');

      results.set(this.pendingRewardsLabel(masterchef, poolId, address), claimableRewards[index]);
    });

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, results);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const contract = this.getMainContract();
    const poolAddresses = await this.getRegisteredTokens(poolIds);

    const poolInfoCalls = poolAddresses.map((poolAddress) => {
      return contract.createCall(this.functions.poolInfo, poolAddress);
    });

    const poolInfo = await this.multicall.callArray(poolInfoCalls, this.meta.chain);
    return this.formatPoolInfo(
      poolInfo.map((poolInfo, idx) => {
        poolInfo.poolId = poolIds[idx];
        return poolInfo;
      }),
    );
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    // parse/format the supplied context data
    const poolIds = Array.from(Array(context.poolLength).keys());

    if (context.badPools && Array.isArray(context.badPools)) {
      // sort descending, and remove each from poolId queue
      context.badPools.sort((a, b) => (a > b ? -1 : 1)).forEach((id) => poolIds.splice(id, 1));
    }

    const poolInfos: IMasterChefPoolInfo[] = await this.fetchPoolInfos(poolIds);

    const tokens = await this.getRegisteredTokens(poolInfos.map((x) => x.poolId));
    const poolInfoWithStakedToken = poolInfos.map((x, i) => ({ ...x, stakedToken: tokens[i] }));

    const totalStakedCalls = tokens.map((token) => {
      const lpContract = new ERC20(token);
      return lpContract.balanceOf(this.meta.address);
    });

    const totalStakedPerPool = await this.multicall.callArray(totalStakedCalls, this.meta.chain);

    return poolInfoWithStakedToken.map((poolInfo, poolIdx) => {
      return this.formatStakingOpportunityMinimal(
        poolInfo,
        totalStakedPerPool[poolIdx].toString(), // totalStaked
        context,
      );
    });
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const [masterchef, poolId] = pool.id.split('::');

    const {
      output: { data: userInfo },
    } = data.get(this.userInfoLabel(masterchef, poolId, address));

    // TODO: Object.values(userInfo) and find index instead of assuming .amount ?
    const balance = normalizeDecimals(
      userInfo[this.getUserInfoAmountKey()].toString(),
      pool.supplied[0].token.decimals,
    );

    if (!balance) return;

    // Update supplied token
    pool.supplied[0] = this.modifyUserEntrySupplied(pool.supplied[0], balance);

    const pendingRewards = data.get(this.pendingRewardsLabel(masterchef, poolId, address));

    const rewardBalance = normalizeDecimals(
      pendingRewards.toString(),
      pool.rewarded[0].token.decimals,
    );

    // Update Reward Token
    Object.assign(pool.rewarded[0], {
      amount: rewardBalance,
      value: rewardBalance * pool.rewarded[0].token.price,
    });

    return pool as IStakingFeatureUserEntry;
  }

  private async getRegisteredTokens(poolIndexes) {
    const contract = this.getMainContract();

    const registeredTokensCalls = [];
    poolIndexes.forEach((poolIndex) => {
      registeredTokensCalls.push(contract.createCall(this.functions.registeredTokens, poolIndex));
    });

    return this.multicall.callArray(registeredTokensCalls, this.meta.chain);
  }
}
