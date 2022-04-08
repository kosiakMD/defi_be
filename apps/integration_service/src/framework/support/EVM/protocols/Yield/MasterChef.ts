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
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureMinimal,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
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
}

interface IPoolInfo {
  poolId: number;
  stakedToken: Address;
  allocPoint: number;
}

const REWARD_REGEX = /^(\w+)(per)((block|sec(ond)?))$/;

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
  }

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

    const poolInfos: IPoolInfo[] = await this.fetchPoolInfos(poolIds);

    const totalStakedCalls = poolInfos.map((poolInfo) => {
      const lpContract = new ERC20(poolInfo.stakedToken);
      return lpContract.balanceOf(this.meta.address);
    });

    const totalStakedPerPool = await this.multicall.callArray(totalStakedCalls, this.meta.chain);

    return poolInfos.map((poolInfo, poolIdx) => {
      return this.formatStakingOpportunityMinimal(
        poolInfo,
        totalStakedPerPool[poolIdx].toString(), //poolInfo[idx] not poolId as some pools can be skipped
        context,
      );
    });
  }

  protected formatStakingOpportunityMinimal(
    poolInfo: IPoolInfo,
    totalStaked: string,
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
          token: { address: poolInfo.stakedToken },
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

  /**
   * Returns the user friendly pool, with tokens & proper decimals
   *
   * @param pool Single raw pool (see above)
   * @param tokens map of priced tokens
   * @returns formatted pool
   */
  protected formatOpportunity(
    pool: IStakingFeatureMinimal,
    tokens: TokenMap,
  ): void | IStakingFeatureOpportunity {
    if (
      !pool.supplied.every((t) => tokens.has(t.token.address)) ||
      !pool.rewarded.every((t) => tokens.has(t.token.address))
    ) {
      // throw error or just return; to silently skip pools
      throw new Error(`Failed to resolve all tokens for pool - ${pool.chain}/${pool.id}`);
    }

    const tvl = pool.supplied.reduce((tvl, poolToken) => {
      const token = tokens.get(poolToken.token.address);
      return tvl + token.price * normalizeDecimals(poolToken.totalSupplied, token.decimals);
    }, 0);

    return {
      feature: pool.feature,
      id: pool.id,
      chain: pool.chain,
      supplied: pool.supplied.map((poolToken) =>
        this.formatOpportunitySuppliedToken(poolToken, tokens.get(poolToken.token.address)),
      ),

      rewarded: pool.rewarded.map((poolToken) =>
        this.formatOpportunityRewardedToken(poolToken, tokens.get(poolToken.token.address), tvl),
      ),
    };
  }

  protected formatOpportunitySuppliedToken(
    poolToken: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(poolToken.totalSupplied, token.decimals);
    return {
      token,
      totalSupplied,
      tvl: totalSupplied * token.price,
    };
  }

  protected formatOpportunityRewardedToken(
    poolToken: IRewardTokenMinimal,
    token: ERC20Token,
    tvl: number, // for calculating apr
  ): IRewardTokenOpportunity {
    const tokensPerSecond = normalizeDecimals(poolToken.rewardPerSecond, token.decimals);
    const pricePerSecond = tokensPerSecond * token.price;

    // yield is a reserved word 🙄
    const { apr: harvests } = this.getYieldBreakdown(tokensPerSecond, 1);
    const { apr, apy } = this.getYieldBreakdown(pricePerSecond, tvl);

    return {
      token,
      harvests,
      // Note: This only includes APR for _this token's rewards_ on the farm
      // so any trading fees are not included here
      apr,
      apy,
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
      return pools.forEach((pool) => {
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
    const balance = normalizeDecimals(userInfo.amount.toString(), pool.supplied[0].token.decimals);

    if (!balance) return;
    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });
    // Update underlying assets
    if (pool.supplied[0].token.underlying?.length === 2) {
      const poolShare = balance / pool.supplied[0].totalSupplied;
      pool.supplied[0].token.underlying.forEach((u) => {
        u.balance = u.reserve * poolShare;
        u.value = u.balance * u.price;
      });
    }

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
      stakedToken: Object.values(pool)[lpTokenIdx].toString().toLowerCase(),
      allocPoint: parseInt(Object.values(pool)[allocPointIdx].toString(), 10),
    }));
  }
}
