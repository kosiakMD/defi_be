import BigNumber from 'bignumber.js';
import { equals } from 'class-validator';

import { Address } from '@app/common';
import { averageBlockTimeByChain } from '@app/common/constant/blocktime';
import { normalizeDecimals } from '@app/common/utils';

import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { MasterChef } from './MasterChef';

export class MasterGeist extends MasterChef {
  protected updateFunctionPredicates?(): void {
    delete this.functionPredicates.rewardToken;
    delete this.interactiveFunctionPredicates.claim;
    this.functionPredicates.pendingRewards = () => (item) => equals(item.name, 'claimableReward');
    this.functionPredicates.registeredTokens = () => (item) =>
      equals(item.name, 'registeredTokens');
  }

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    context.totalAllocPoint = parseInt(context.totalAllocPoint, 10);

    // convert rewards per block to rewards per second to
    // standardize across chains
    const avgBlockTime = averageBlockTimeByChain[this.meta.chain] || 1;
    if (!averageBlockTimeByChain[this.meta.chain]) {
      this.logger.warn(
        `Missing Average BlockTime for chain ${this.meta.chain}`,
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

    const calls = new Map();
    pools.forEach((pool) => {
      const [masterchef, poolId] = pool.id.split('::');

      calls.set(
        this.userInfoLabel(masterchef, poolId, address),
        contract.createCall(this.functions.userInfo, pool.supplied[0].token.address, address),
      );
      calls.set(
        this.pendingRewardsLabel(masterchef, poolId, address),
        contract.createCall(this.functions.pendingRewards, address, [
          pool.supplied[0].token.address,
        ]),
      );
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

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

    const poolAddressesCalls = poolIds.map((poolId) => {
      return contract.createCall(this.functions.registeredTokens, poolId);
    });
    const poolAddresses = await this.multicall.callArray(poolAddressesCalls, this.meta.chain);

    const poolInfoCalls = poolAddresses.map((address) => {
      return contract.createCall(this.functions.poolInfo, address);
    });

    const poolInfo = await this.multicall.callArray(poolInfoCalls, this.meta.chain);
    return this.formatPoolInfo(
      poolInfo.map((poolInfo, idx) => {
        poolInfo.poolId = poolIds[idx];
        poolInfo.stakedToken = poolAddresses[idx].toLowerCase();
        return poolInfo;
      }),
    );
  }
  // protected async getTokens(addresses: Address[]): Promise<[Address, any][]> {
  //   return this.assetService.getAssets(
  //     addresses
  //       .filter((x) => x)
  //       .map((address) => ({ address: address.toLowerCase(), chainId: this.meta.chain })),
  //   ); // TODO: Format and match token interfaces
  // }
  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const [masterchef, poolId] = pool.id.split('::');

    const {
      output: { data: userInfo },
    } = data.get(this.userInfoLabel(masterchef, poolId, address));

    const balance = normalizeDecimals(
      userInfo[this.getUserInfoAmountKey()].toString(),
      pool.supplied[0].token.decimals,
    );

    if (!balance) return;

    // Update supplied token
    pool.supplied[0] = this.modifyUserEntrySupplied(pool.supplied[0], balance);

    const {
      output: { data: pendingRewards },
    } = data.get(this.pendingRewardsLabel(masterchef, poolId, address));

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
}
