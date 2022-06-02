import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
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
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { IRewardTokenMinimal } from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenMinimal } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export type IStakingFeatureMinimalSpirit = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void
>;

export class SpiritLocked
  extends SingleContractProtocol<
    IStakingFeatureMinimalSpirit,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry
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

  protected functionPredicates: INamedFunctionPredicates = {
    locked: () => (item) => item.name === 'locked',
    token: () => (item) => item.name === 'token',
    supply: () => (item) => item.name === 'supply',
  };

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();
    const calls = new Map([
      [
        `${address} ${pools[0].supplied[0].token.address}`,
        contract.createCall(this.functions.locked, address),
      ],
    ]);
    const userBalances = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools
      .map((p) => {
        return this.formatUserData(address, p, userBalances);
      })
      .filter((ub) => ub !== undefined);
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const lpToken = usersPool.supplied[0];
    const userBalance: { amount: any; end: any } = data.get(
      `${address} ${usersPool.supplied[0].token.address}`,
    ).output.data;

    if (userBalance.amount.toString() === '0') {
      return;
    }

    const balanceNormalized = normalizeDecimals(
      userBalance.amount.toString(),
      lpToken.token.decimals,
    );
    Object.assign(usersPool.supplied[0], {
      amount: balanceNormalized,
      value: balanceNormalized * lpToken.token.price,
      unlocked: +userBalance.end.toString() * 1000,
    });

    return usersPool as IStakingFeatureUserEntry;
  }

  formatUnderlyingTokens(poolToken: ERC20Token, poolShare: number) {
    const balance = poolToken.reserve * poolShare;
    if (poolToken.underlying) {
      poolToken.underlying = poolToken.underlying.map((pt) => {
        const underlyingPoolShare = poolToken.balance / poolToken.totalSupply;
        return this.formatUnderlyingTokens(pt, underlyingPoolShare);
      });
    }
    return {
      ...poolToken,
      balance: balance,
      value: balance * poolToken.price,
    };
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimalSpirit[]> {
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
            totalSupplied: context.supply.toString(),
          },
        ],
        rewarded: [
          {
            token: {
              address: this.meta.address.toLowerCase(),
            },
          },
        ],
      },
    ];
  }
}
