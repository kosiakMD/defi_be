import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
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

export type IStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void
>;

export interface ILockedMeta extends IProtocolMeta {
  address: Address;
  context: {
    rewardToken: string;
  };
}

export class RootLocked
  extends SingleContractProtocol<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    ILockedMeta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: FakeAssetService,
  ) {
    super();
  }

  protected functionPredicates: INamedFunctionPredicates = {
    lockedInfo: () => (item) => ['locked', 'getPersonalStakes'].includes(item.name),
    tokenLocked: () => (item) => ['token', 'lockedToken'].includes(item.name),
    totalSupply: () => (item) => ['totalSupply', 'supply', 'totalStaked'].includes(item.name),
  };

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();
    const calls = new Map([
      [
        `${address} ${pools[0].supplied[0].token.address}`,
        contract.createCall(this.functions.lockedInfo, address),
      ],
    ]);
    const userBalances = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools
      .map((p) => {
        return this.formatUserData(p, address, userBalances);
      })
      .filter((ub) => !!ub);
  }

  protected formatUserData(
    pool: IStakingFeatureOpportunity,
    address: Address,
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
      unlockTime: +userBalance.end.toString() * 1000,
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
  }): Promise<IStakingFeatureMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: context.tokenLocked.toLowerCase(),
            },
            totalSupplied: context.totalSupply.toString(),
          },
        ],
        rewarded: [
          {
            token: {
              address: this.meta.context?.rewardToken || this.meta.address.toLowerCase(),
            },
          },
        ],
      },
    ];
  }
}
