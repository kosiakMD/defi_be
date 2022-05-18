import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { averageBlockTimeByChain } from '@app/common/constant/blocktime';
import { equals, normalizeDecimals, regex, startsWith } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureMinimal,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { ISupplyTokenOpportunity } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

interface IMasterChefMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string; // Genesis, Farm, AceLab
  context?: {
    badPools?: number[]; // poolIds to skip
    [key: string]: any;
  };
  links: {
    getOpportunityLink: (opportunity: any) => string;
  };
}

export interface IMasterChefPoolInfo {
  poolId: number;
  stakedToken: Address;
  allocPoint: number;
}

const REWARD_REGEX = /^(\w+)(per)((block|sec(ond)?))$/;

/**
 * Classic masterchef. Deposit a token, or LP token into
 * a pool, and receive a portion of the pool emissions
 */
export class MasterChef
  extends SingleContractProtocol<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IMasterChefMeta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
  ) {
    super();
    if (this.updateFunctionPredicates) {
      this.updateFunctionPredicates();
    }
  }

  protected updateFunctionPredicates?(): void;

  // Best Guess predicates to auto detect masterchef contract
  // Ideally in a base class such as MasterChef these will be as generic as possible and
  // attempt to get as many matches from various projects as possible
  // If a project can not be matched, this class can be extended and this can be overridden
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
    totalAllocPoint: () => (item) => startsWith(item.name, 'totalAlloc'),
    poolInfo: () => (item) => startsWith(item.name, 'poolInf'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => startsWith(item.name, 'pending'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    context.rewardToken = context.rewardToken.toLowerCase();
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
      return this.formatStakingOpportunityMinimal(
        poolInfo,
        totalStakedPerPool[poolIdx].toString(), // totalStaked
        totalSupplyPerPool[poolIdx].toString(), // totalSupply
        context,
      );
    });
  }

  protected formatStakingOpportunityMinimal(
    poolInfo: IMasterChefPoolInfo,
    totalStaked: string,
    totalSupply: string,
    context: { [key: string]: any },
  ): IStakingFeatureMinimal {
    const rewardShare = poolInfo.allocPoint / context.totalAllocPoint;

    const rewardPerSecond = new BigNumber(context.rewardPerSecond) //
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

  protected fetchUserData(addresses: Address[], pools: IStakingFeatureOpportunity[]) {
    const contract = this.getMainContract();

    // Loop and get all user balances for all pools
    // TODO: Benchmark all calls at once, or userInfo once,
    // then pendingRewards for only the required pools
    const calls = new Map();
    addresses.forEach((address) => {
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
    });

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }

  protected modifyUserEntrySupplied(supplied: ISupplyTokenOpportunity, balance: number) {
    // const poolShare = balance / supplied.token['totalSupply'];
    const poolShare = balance / supplied.totalSupply;
    supplied.token.underlying?.forEach((underlying) => {
      underlying.balance = underlying.reserve * poolShare;
      underlying.value = underlying.balance * underlying.price;
    });

    return Object.assign(supplied, {
      amount: balance,
      value: balance * supplied.token.price,
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

    const poolInfo = await this.multicall.callArray(poolInfoCalls, this.meta.chain);
    return this.formatPoolInfo(
      poolInfo.map((poolInfo, idx) => {
        poolInfo.poolId = poolIds[idx];
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
      stakedToken: pool.stakedToken || Object.values(pool)[lpTokenIdx]?.toString().toLowerCase(),
      allocPoint: parseInt(Object.values(pool)[allocPointIdx].toString(), 10),
    }));
  }

  protected getUserInfoAmountKey(): string {
    return 'amount';
  }
}
