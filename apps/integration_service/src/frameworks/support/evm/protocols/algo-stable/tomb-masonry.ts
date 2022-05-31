import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/call-data';
import { equals, normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature-staking.interface';
import { AbiService } from '../../abi-module/abi-service';
import { SingleContractProtocol } from '../../single-contract-protocol';

export class TombMasonry extends SingleContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry
> {
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

  functionPredicates: INamedFunctionPredicates = {
    totalSupply: () => (item) => equals(item.name, 'totalSupply'),
    stakingToken: () => (item) => equals(item.name, 'share'),
    rewardToken: () => (item) => equals(item.name, 'tomb'),
    earned: () => (item) => equals(item.name, 'earned'),
    balance: () => (item) => equals(item.name, 'balanceOf'),
    treasury: () => (item) => equals(item.name, 'treasury'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.totalSupply = context.totalSupply.toString();
    context.stakingToken = context.stakingToken.toLowerCase();
    context.rewardToken = context.rewardToken.toLowerCase();

    return context;
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const data: IStakingFeatureMinimal = {
      id: this.meta.address,
      feature: FeatureEnum.staking,
      chain: this.meta.chain,
      supplied: [
        {
          token: {
            address: context.stakingToken,
          },
          totalSupplied: context.totalSupply,
        },
      ],
      rewarded: [
        {
          token: {
            address: context.rewardToken,
          },
        },
      ],
    };

    return [data];
  }

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();

    const calls = new Map<string, CallData>();

    calls.set('earned', contract.createCall(this.functions.earned, address));

    calls.set('balance', contract.createCall(this.functions.balance, address));

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return [this.formatUserData(address, pools[0], results)];
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const balance = normalizeDecimals(
      data.get('balance').output.data,
      pool.supplied[0].token.decimals,
    );

    if (!balance) return;
    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });

    const {
      output: { data: pendingRewards },
    } = data.get('earned');

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
