import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates, IRootProtocol } from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { IRewardTokenMinimal } from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenMinimal } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export type IStakingFeatureMinimalDefi = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void
>;

export class DefiSwapLocked
  extends SingleContractProtocol<
    IStakingFeatureMinimalDefi,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry
  >
  implements IRootProtocol
{
  protected functionPredicates: INamedFunctionPredicates = {
    token: () => (item) => item.name === 'token',
    totalStaked: () => (item) => item.name === 'totalStaked',
    getPersonalStakes: () => (item) => item.name === 'getPersonalStakes',
  };

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();
    const calls = new Map([
      [
        `${address} ${pools[0].supplied[0].token.address}`,
        contract.createCall(this.functions.getPersonalStakes, address),
      ],
    ]);
    const multiCallsUserBalances = await this.multicall.handleInBatches(calls, this.meta.chain);
    const userBalances = multiCallsUserBalances.get(
      `${address} ${pools[0].supplied[0].token.address}`,
    ).output.data;

    const poolsList = userBalances['0'].map((l, idx) => ({
      ...pools[0],
      balance: userBalances['1'][idx],
      lockedEnd: l,
    }));

    const test = poolsList
      .map((p) => {
        return this.formatUserData(address, p);
      })
      .filter((ub) => ub !== undefined);
    return test;
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    // data: Map<string, CallData>,
  ): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const lpToken = usersPool.supplied[0];

    const balanceNormalized = normalizeDecimals(
      usersPool['balance'].toString(),
      lpToken.token.decimals,
    );
    Object.assign(usersPool.supplied[0], {
      amount: balanceNormalized,
      value: balanceNormalized * lpToken.token.price,
      lockedEnd: usersPool['lockedEnd'] * 1000, //ms
    });

    return usersPool as IStakingFeatureUserEntry;
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimalDefi[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: context.token.toLowerCase(),
            },
            totalSupplied: context.totalStaked.toString(),
          },
        ],
        rewarded: [
          {
            token: {
              address: context.token.toLowerCase(),
            },
          },
        ],
      },
    ];
  }

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
}
