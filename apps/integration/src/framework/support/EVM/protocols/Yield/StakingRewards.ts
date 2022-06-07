import { Cache } from 'cache-manager';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { endsWith, normalizeDecimals, startsWith } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { MultiContractProtocol } from '../../MultiContractProtocol';

/**
 * This Template is for when many pools each have individual contracts for staking
 * however every contract has the same (or close enough) ABI. This is in contrast to
 * Masterchef where a single contract is used for staking for all pools
 */
export class StakingRewards extends MultiContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry
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
    const opportunity = {
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

    return opportunity;
  }
}
