import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface InterestBearingTokenMetaInterface extends IProtocolMeta {
  address: string;
}

type IInterestBearingTokenMinimal = BaseWithTokens<ISupplyTokenMinimal, IRewardTokenMinimal>;

type IInterestBearingTokenOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity
>;

type IInterestBearingTokenUser = BaseWithTokens<ISupplyTokenUserEntry, IRewardTokenUserEntry>;
/**
 * Single interest bearing token with underlying balance
 *
 * In general staking contract is actually a ERC20 token itself.
 * so Staked Token and Reward Token are often the same token (but not always)
 * and user balance is # of stakedTokens * some exchange rate
 */
export class InterestBearingToken extends SingleContractProtocol<
  IInterestBearingTokenMinimal,
  IInterestBearingTokenOpportunity,
  IInterestBearingTokenUser,
  InterestBearingTokenMetaInterface
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
  ) {
    super();
  }

  protected functionPredicates: INamedFunctionPredicates = {
    stakedToken: () => (item) => item.name === 'STAKED_TOKEN',
    rewardToken: () => (item) => item.name === 'REWARD_TOKEN',
    getStakedBalance: () => (item) => item.name === 'balanceOf',
    getRewardBalance: () => (item) => item.name === 'getTotalRewardsBalance',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IInterestBearingTokenMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: { address: context.stakedToken },
          // totalSupplied: context.totalSupply.toString(), // staked token total supply * exchange rate
        },
        reward: {
          token: { address: context.rewardToken },
        },
      },
    ];
  }

  protected async fetchUserData(
    address: string,
    pools: IInterestBearingTokenOpportunity[],
  ): Promise<IInterestBearingTokenUser[]> {
    const [pool] = pools;
    const contract = this.getMainContract();
    const [stakedBalance, rewardBalance] = await this.multicall.callArray(
      [
        contract.createCall(this.functions.getStakedBalance, address),
        contract.createCall(this.functions.getRewardBalance, address),
      ],
      this.meta.chain,
    );
    const stakedAmount = normalizeDecimals(stakedBalance, pool.supply.token.decimals);
    const rewardAmount = normalizeDecimals(rewardBalance, pool.reward.token.decimals);

    return [
      {
        ...pool,
        supply: {
          ...pool.supply,
          amount: stakedAmount,
          value: stakedAmount * pool.supply.token.price,
        },
        reward: {
          ...pool.reward,
          amount: rewardAmount,
          value: rewardAmount * pool.reward.token.price,
          apr: null,
          apy: null,
        },
      },
    ];
  }
}
