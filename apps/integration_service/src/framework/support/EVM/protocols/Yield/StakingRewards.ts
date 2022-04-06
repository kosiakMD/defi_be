import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { endsWith, normalizeDecimals, startsWith } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates, IProtocolMeta, TokenMap } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
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
import { MultiContractProtocol } from '../../MultiContractProtocol';

interface IStakingRewardMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  api?: {
    endpoint: string;
    path: string;
    handler: () => Address[];
  };
  scrape: {
    url: string;
  };
}

/**
 * This Template is for when many pools each have individual contracts for staking
 * however every contract has the same (or close enough) ABI. This is in contrast to
 * Masterchef where a single contract is used for staking for all pools
 */
export class StakingRewards extends MultiContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
  IStakingRewardMeta
> {
  protected functionPredicates: INamedFunctionPredicates = {
    balanceOf: () => (item) => ['balanceOf', 'userInfo'].includes(item.name),
    earned: () => (item) => ['pendingReward', 'earned'].includes(item.name),
    stakingToken: () => (item) => startsWith(item.name, 'stak') && endsWith(item.name, 'token'),
    rewardToken: () => (item) => ['rewardToken', 'rewardsToken'].includes(item.name),
    rewardPerSecond: () => (item) => ['rewardRate', 'rewardPerBlock'].includes(item.name), // TODO: unclear if per block, or per second here (QuickSwap)
  };

  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }

  protected callLabel(address: Address, genericName: string) {
    return `${address}.${genericName}()`;
  }
  protected balanceOfLabel(address: Address, user: Address) {
    return `${address}.balanceOf(${user})`;
  }

  protected earnedLabel(address: Address, reward: Address, user: Address) {
    return `${address}.${reward}.earned(${user})`;
  }

  protected async fetchOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const poolAddresses = await this.fetchPoolList();
    // Dynamically load inputless functions here instead of hardcoding each
    // call so when its extended, we have a better chance of minimal changes
    const inputlessFunctions = Object.values(this.functions).filter((item) => !item.inputs?.length);
    const calls = new Map();
    poolAddresses.map((address) => {
      const contract = new DynamicContract(address);
      inputlessFunctions.forEach((item) => {
        // Note: Map keys match generic names from 'functions'
        calls.set(this.callLabel(address, item.name), contract.createCall(item));
      });
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    const totalStakedCalls = new Map();
    poolAddresses.map((address) => {
      const stakedToken = results
        .get(this.callLabel(address, this.functions.stakingToken.name))
        .output.data.toString();
      const contract = new ERC20(stakedToken);
      totalStakedCalls.set(this.callLabel(address, 'totalStaked'), contract.balanceOf(address));
    });

    // merge results
    const totalStakedResults = await this.multicall.handleInBatches(
      totalStakedCalls,
      this.meta.chain,
    );

    totalStakedResults.forEach((value, key) => {
      results.set(key, value);
    });

    return poolAddresses.map((poolAddress) =>
      this.formatStakingOpportunityMinimal(poolAddress, results),
    );
  }

  // different from masterchef
  protected async fetchUserData(
    addresses: string[],
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    // Loop and get all user balances for all pools
    // TODO: Benchmark all calls at once, or userInfo once,
    // then pendingRewards for only the required pools
    const calls = new Map();
    addresses.forEach((address) => {
      return pools.forEach((pool) => {
        const contract = new DynamicContract(pool.id);
        calls.set(
          this.balanceOfLabel(pool.id, address),
          contract.createCall(this.functions.balanceOf, address),
        );
        calls.set(
          this.earnedLabel(pool.id, pool.rewarded[0].token.address, address),
          contract.createCall(this.functions.earned, address),
        );
      });
    });

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }

  // different from masterchef (balanceOf/earned vs userInfo/pendingRewards)
  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const {
      output: { data: balanceRawOutput },
    } = data.get(this.balanceOfLabel(pool.id, address));

    // check if its a number or a { amount: number }
    const balanceRaw = 'amount' in balanceRawOutput ? balanceRawOutput.amount : balanceRawOutput;

    const balance = normalizeDecimals(balanceRaw.toString(), pool.supplied[0].token.decimals);

    if (!balance) return;
    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });

    pool.rewarded.forEach((reward) => {
      const {
        output: { data: earnedRaw },
      } = data.get(this.earnedLabel(pool.id, reward.token.address, address));

      const earned = normalizeDecimals(earnedRaw.toString(), reward.token.decimals);

      // Update Reward Token
      Object.assign(reward, {
        amount: earned,
        value: earned * reward.token.price,
      });
    });

    return pool as IStakingFeatureUserEntry;
  }

  // different from masterchef (supplied multicall vs context)
  protected formatStakingOpportunityMinimal(
    address: Address,
    data: Map<string, CallData>,
  ): IStakingFeatureMinimal {
    return {
      id: address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: data
              .get(this.callLabel(address, this.functions.stakingToken.name))
              .output.data.toLowerCase(),
          },
          totalSupplied: data.get(this.callLabel(address, 'totalStaked')).output.data.toString(),
        },
      ],
      rewarded: [
        {
          token: {
            address: data
              .get(this.callLabel(address, this.functions.rewardToken.name))
              .output.data.toLowerCase(),
          },
          rewardPerSecond: data
            .get(this.callLabel(address, this.functions.rewardPerSecond.name))
            .output.data.toString(),
        },
      ],
    };
  }

  // same as masterchef
  protected formatOpportunity(
    pool: IStakingFeatureMinimal,
    tokens: TokenMap,
  ): void | IStakingFeatureOpportunity {
    if (
      !pool.supplied.every((t) => tokens.has(t.token.address)) ||
      !pool.rewarded.every((t) => tokens.has(t.token.address))
    ) {
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
  // same as masterchef
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

  // same as masterchef
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
}
