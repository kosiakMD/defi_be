import BigNumber from 'bignumber.js';

import { Address } from '@app/common';
import { averageBlockTimeByChain } from '@app/common/constant/blocktime';
import { equals, regex, startsWith } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureMinimal,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { MasterChef } from './MasterChef';

export interface IMasterChefMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string; // Genesis, Farm, AceLab
  context?: {
    badPools?: number[]; // poolIds to skip
  };
  links?: {
    getOpportunityLink: () => string;
  };
}

export interface IMasterChefPoolInfo {
  poolId: number;
  stakedToken: Address;
  allocPoint: number;
  rewardPerSecond: number;
}

const REWARD_REGEX = /^(\w+)(per)((block|sec(ond)?))$/;

/**
 * Classic masterchef. Deposit a token, or LP token into
 * a pool, and receive a portion of the pool emissions
 */
export class MasterChefV2 extends MasterChef implements IRootProtocol {
  protected updateFunctionPredicates?(): void;

  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    // first try to get an TOKEN per (block/second) item
    rewardPerSecond: () => (item) =>
      !startsWith(item.name, 'max') && !!regex(item.name, REWARD_REGEX)?.[0],
    // then use the above ABI item, to parse out the probable TOKEN name
    rewardToken:
      ({ context }) =>
      (item) =>
        equals(item.name, regex(context.rewardPerSecond?.name, REWARD_REGEX)?.[1]),
    totalAllocPoint: () => (item) => startsWith(item.name, 'totalRegularAlloc'),
    poolInfo: () => (item) => startsWith(item.name, 'poolInf'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    lpToken: () => (item) => startsWith(item.name, 'lpToken'),
    pendingRewards: () => (item) => startsWith(item.name, 'pending'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    context.rewardToken = context.rewardToken.toLowerCase();
    context.totalAllocPoint = parseInt(context.totalAllocPoint, 10);
    return context;
  }

  /**
   * fetches all available pools on this protocol
   *
   * @param context hardcoded data & some multicall/web3 data
   * @returns full pools array
   */
  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    // parse/format the supplied context data
    const poolIds = Array.from(Array(context.poolLength).keys());

    if (context.badPools && Array.isArray(context.badPools)) {
      // sort descending, and remove each from poolId queue
      context.badPools.sort((a, b) => (a > b ? -1 : 1)).forEach((id) => poolIds.splice(id, 1));
    }

    // convert rewards per block to rewards per second to
    // standardize across chains
    const avgBlockTime = averageBlockTimeByChain[this.meta.chain] || 1;
    if (!averageBlockTimeByChain[this.meta.chain]) {
      this.logger.warn(
        `Missing Average BlockTIme for chain ${this.meta.chain}`,
        this.constructor.name,
      );
    }

    const poolInfos: IMasterChefPoolInfo[] = await this.fetchPoolInfos(poolIds);

    const totalStakedCalls = poolInfos.map((poolInfo) => {
      const lpContract = new ERC20(poolInfo.stakedToken);
      return lpContract.balanceOf(this.meta.address);
    });

    const totalSupplyCalls = poolInfos.map((poolInfo) => {
      const lpContract = new ERC20(poolInfo.stakedToken);
      return lpContract.totalSupply();
    });

    const [totalStakedPerPool, totalSupplyPerPool] = await Promise.all([
      this.multicall.callArray(totalStakedCalls, this.meta.chain),
      this.multicall.callArray(totalSupplyCalls, this.meta.chain),
    ]);

    return poolInfos.map((poolInfo, poolIdx) => {
      const rewardPerSecond = new BigNumber(poolInfo.rewardPerSecond.toString())
        .dividedBy(avgBlockTime)
        .toString();

      return this.formatStakingOpportunityMinimalV2(
        poolInfo,
        totalStakedPerPool[poolIdx].toString(), // totalStaked
        totalSupplyPerPool[poolIdx].toString(), // totalSupply
        rewardPerSecond, // rewardPerSeconds
        context,
      );
    });
  }

  protected formatStakingOpportunityMinimalV2(
    poolInfo: IMasterChefPoolInfo,
    totalStaked: string,
    rewardPerSecondForPool: string,
    totalSupply: string,
    context: Record<string, any>,
  ): IStakingFeatureMinimal {
    const rewardShare = poolInfo.allocPoint / context.totalAllocPoint;

    const rewardPerSecond = new BigNumber(rewardPerSecondForPool) //
      .times(rewardShare) // percentage of total reward for this pool
      .toString();

    return {
      id: `${this.meta.address}::${poolInfo.poolId}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: poolInfo.stakedToken,
          },
          totalSupply: totalSupply,
          totalSupplied: totalStaked,
        },
      ],
      rewarded: [
        {
          token: { address: context.rewardToken },
          rewardPerSecond,
        },
      ],
    };
  }

  protected userInfoLabel(masterchef: Address, poolId: string, user: Address): string {
    return `${masterchef}.userInfo(${poolId}, ${user})`;
  }
  protected pendingRewardsLabel(masterchef: Address, poolId: string, user: Address): string {
    return `${masterchef}.pendingRewards(${poolId}, ${user})`;
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();

    const calls = new Map();
    pools.forEach((pool) => {
      // TODO: include 'meta' object so we can just provide e.g. poolId on masterchefs?
      // This works, but feels like a hack. but how to cleanly allow extra pool metadata
      // without abuse/misuse?
      const [masterchef, poolId] = pool.id.split('::');

      calls.set(
        this.userInfoLabel(masterchef, poolId, address),
        contract.createCall(this.functions.userInfo, poolId, address),
      );
      calls.set(
        this.pendingRewardsLabel(masterchef, poolId, address),
        contract.createCall(this.functions.pendingRewards, poolId, address),
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

  /**
   * returns 'any' here, since proper types will be difficult due to the dynamic nature
   * of masterchef forks. Generally speaking, the return values here should be formatted
   * but match the raw return values from the contract.
   * @param poolLength
   * @returns pool data
   */
  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const contract = this.getMainContract();

    const poolInfoCalls = poolIds.map((poolId) => {
      return contract.createCall(this.functions.poolInfo, poolId);
    });

    const stakedTokenCalls = poolIds.map((poolId) => {
      return contract.createCall(this.functions.lpToken, poolId);
    });

    const rewardPerSecondCalls = poolIds.map((poolId) => {
      return contract.createCall(this.functions.rewardPerSecond, poolId);
    });

    const [poolInfo, stakedToken, rewardPerSecond] = await Promise.all([
      this.multicall.callArray(poolInfoCalls, this.meta.chain),
      this.multicall.callArray(stakedTokenCalls, this.meta.chain),
      this.multicall.callArray(rewardPerSecondCalls, this.meta.chain),
    ]);

    return this.formatPoolInfo(
      poolInfo.map((poolInfo, idx) => {
        poolInfo.poolId = poolIds[idx];
        poolInfo.stakedToken = stakedToken[idx].toLowerCase();
        poolInfo.rewardPerSecond = rewardPerSecond[idx];
        return poolInfo;
      }),
    );
  }

  protected formatPoolInfo(poolInfo: any[]) {
    // Get pool info outputs
    const poolInfoOutputs = this.functions.poolInfo.outputs;
    const lpTokenIdx = poolInfoOutputs.findIndex((output) => output.type === 'address');
    const allocPointIdx = poolInfoOutputs.findIndex((output) =>
      output.name.toLowerCase().startsWith('alloc'),
    );
    return poolInfo.map((pool) => ({
      poolId: pool.poolId,
      rewardPerSecond: pool.rewardPerSecond.toString(),
      stakedToken: pool.stakedToken || Object.values(pool)[lpTokenIdx]?.toString().toLowerCase(),
      allocPoint: parseInt(Object.values(pool)[allocPointIdx].toString(), 10),
    }));
  }
}
