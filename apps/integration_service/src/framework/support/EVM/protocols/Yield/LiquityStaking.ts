import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
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

export interface ILiquityStakingMeta extends IProtocolMeta {
  address: Address;
  context: {
    rewardBToken: Address;
  };
}

export type ILiquityStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal[]
>;

export type ILiquityStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity[]
>;

export type ILiquityStakingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry[]
>;
export class LiquityStaking extends SingleContractProtocol<
  ILiquityStakingFeatureMinimal,
  ILiquityStakingFeatureOpportunity,
  ILiquityStakingFeatureUserEntry,
  ILiquityStakingMeta
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

  protected functionPredicates: INamedFunctionPredicates = {
    stakedToken: () => (item) => item.name === 'lqtyToken',
    rewardAToken: () => (item) => item.name === 'lusdToken', // secondary reward token is native ETH 0x000
    balance: () => (item) => item.name === 'stakes',
    pendingRewardA: () => (item) => item.name === 'getPendingLUSDGain',
    pendingRewardB: () => (item) => item.name === 'getPendingETHGain',
    totalStaked: () => (item) => item.name === 'totalLQTYStaked',
  };

  async fetchOpportunityData(context): Promise<ILiquityStakingFeatureMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: { address: context.stakedToken.toLowerCase() },
          totalSupplied: context.totalStaked.toString(),
        },
        rewarded: [
          {
            token: { address: context.rewardAToken.toLowerCase() },
          },
          {
            token: { address: context.rewardBToken.toLowerCase() },
          },
        ],
      },
    ];
  }

  protected formatOpportunityRewardedToken(
    poolToken: IRewardTokenMinimal,
    token: ERC20Token,
  ): IRewardTokenOpportunity {
    return {
      token,
      // rewards are based on borrow & redemption fees so impossible
      // to estimate without historical data
      harvests: null,
      apr: null,
      apy: null,
    };
  }

  protected async fetchUserData(
    address: string,
    pools: ILiquityStakingFeatureOpportunity[],
  ): Promise<ILiquityStakingFeatureUserEntry[]> {
    const contract = new DynamicContract(this.meta.address);
    const [balance, pendingRewardA, pendingRewardB] = await this.multicall.callArray(
      [
        contract.createCall(this.functions.balance, address),
        contract.createCall(this.functions.pendingRewardA, address),
        contract.createCall(this.functions.pendingRewardB, address),
      ],
      this.meta.chain,
    );

    return pools.map((pool) => {
      const amount = normalizeDecimals(balance, pool.supply.token.decimals);
      if (!amount) return null;

      return {
        ...pool,
        supply: {
          ...pool.supply,
          amount,
          value: amount * pool.supply.token.price,
        },
        rewarded: pool.rewarded.map((reward) => {
          const amountRaw =
            reward.token.address === this.meta.context.rewardBToken
              ? pendingRewardB
              : pendingRewardA;

          const amount = normalizeDecimals(amountRaw, reward.token.decimals);
          return {
            ...reward,
            amount,
            value: amount * reward.token.price,
          };
        }),
      };
    });
  }
}
