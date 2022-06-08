import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import {
  IBalancerPoolsResponse,
  IBalancerUsersPoolSharesResponse,
  Pool,
  POOL_QUERY,
  USERS_POOL_SHARES,
} from '../../Subgraphs/BalancerSubgraph';
import { SubgraphsContractProtocol } from '../../SubgraphsContractProtocol';

type UsersDataResponse = Map<Address, Array<{ balance: string; address: Address }>>;

export interface IBalancerPoolMeta extends IProtocolMeta {
  context: {
    endpoint: string;
    networkId: string;
  };
  name: string;
  feature: FeatureEnum.pools;
}

export class BalancerLiquidity
  extends SubgraphsContractProtocol<
    IPoolFeatureMinimal,
    IPoolFeatureOpportunity,
    IPoolFeatureUser,
    IBalancerPoolMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  get GQLEndpoint(): string {
    return new URL(this.meta.context.networkId, this.meta.context.endpoint).toString();
  }

  async getCacheableOpportunityData(): Promise<IPoolFeatureMinimal[]> {
    const $data = this.httpService
      .post<IBalancerPoolsResponse>(this.GQLEndpoint, {
        query: POOL_QUERY,
      })
      .pipe(
        mergeMap((response) => response.data.data.pools),
        map((pool) => this.toFeatureEntryMinimal(pool)),
        toArray(),
      );

    return await firstValueFrom($data);
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = +supplied.totalSupplied; // already normalized;
    const apy = this.formatSupplyApy?.(supplied);
    return {
      token,
      apy,
      totalSupplied,
      tvl: totalSupplied * token.price,
    };
  }

  protected formatOpportunityReceiptToken(
    opportunity: IPoolFeatureMinimal,
    token: ERC20Token,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokens: Map<Address, ERC20Token>,
  ) {
    if (!token) {
      return null;
    }

    const totalSupplied = +opportunity.token.totalSupplied; // already normalized;
    if (!token.price) {
      token.price =
        opportunity.supplied.reduce((prev, next) => {
          const token = tokens.get(next.token.address);
          return prev + +next.totalSupplied * (token?.price || 0);
        }, 0) / totalSupplied;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { underlying, ...rest } = token;

    return { ...rest, totalSupplied };
  }

  protected formatUserData(
    address: Address,
    pools: IPoolFeatureOpportunity[],
    usersData: UsersDataResponse,
  ): IPoolFeatureUser[] {
    const result: IPoolFeatureUser[] = [];
    const userData = usersData.get(address) || [];
    for (const { address, balance } of userData) {
      const pool = pools.find((p) => p.id === address);
      if (!pool) continue;

      const poolClone = cloneDeep(pool);

      const amountBN = new BN(balance);
      const poolShare = amountBN.div(poolClone.token.totalSupplied);

      const supplied: ISupplyTokenUserEntry[] = poolClone.supplied.map((supply) => {
        const amount = poolShare.times(supply.totalSupplied);
        return {
          ...supply,
          amount: amount.toNumber(),
          value: amount.times(supply.token.price).toNumber(),
        };
      });

      poolClone.token.amount = amountBN.toNumber();
      poolClone.token.value = amountBN.times(poolClone.token.price).toNumber();

      result.push({ ...poolClone, supplied });
    }
    return result;
  }

  protected async fetchUserData(addresses: string[]): Promise<UsersDataResponse> {
    const $data = this.httpService
      .post<IBalancerUsersPoolSharesResponse>(this.GQLEndpoint, {
        query: USERS_POOL_SHARES,
        variables: { addresses },
      })
      .pipe(
        mergeMap((response) => response.data.data.users),
        map((liquidity) => {
          return {
            address: liquidity.id,
            liquidity: liquidity.sharesOwned.map((share) => {
              return {
                ...share.poolId,
                balance: share.balance,
              };
            }),
          };
        }),
        toArray(),
      );
    const data = await firstValueFrom($data);
    return new Map(data.map((b) => [b.address, b.liquidity]));
  }

  private toFeatureEntryMinimal(pool: Pool): IPoolFeatureMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      token: {
        address: pool.address,
        totalSupplied: pool.totalShares,
      },
      supplied: pool.tokens.map((token) => {
        return {
          token: { address: token.address },
          totalSupplied: token.balance,
        };
      }),
    };
  }
}
