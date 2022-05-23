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
import { IProtocolMeta, IRootProtocol, TokenMap } from '../../../interfaces';
import {
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
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
type ERC20TokenMinimal = {
  address: string;
  underlying?: {
    address: string;
    reserve: string;
  }[];
};

interface IBalancerSupplyTokenMinimal extends ISupplyTokenMinimal {
  token: ERC20TokenMinimal;
}

export interface IBalancerPoolMeta extends IProtocolMeta {
  context: {
    endpoint: string;
    networkId: string;
  };
  name: string;
  feature: FeatureEnum.pools;
}

type IBalancerPoolMinimal = BaseWithTokens<IBalancerSupplyTokenMinimal[], void, void, void>;

export class BalancerLiquidity
  extends SubgraphsContractProtocol<
    IBalancerPoolMinimal,
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

  async initialize() {
    //
  }

  get GQLEndpoint(): string {
    return new URL(this.meta.context.networkId, this.meta.context.endpoint).toString();
  }

  async getCacheableOpportunityData(): Promise<IBalancerPoolMinimal[]> {
    const $data = this.httpService
      .post<IBalancerPoolsResponse>(this.GQLEndpoint, {
        query: POOL_QUERY,
      })
      .pipe(
        mergeMap((response) => response.data.data.pools),
        map((pool) => this.toFeatureEntryMinimal(pool)),
        toArray(),
      );

    const data = await firstValueFrom($data);
    return data;
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

      const supplied: ISupplyTokenUserEntry[] = poolClone.supplied.map((position) => {
        const amountBN = new BN(balance);
        const amountUSD = amountBN.times(position.token.price);
        const poolShare = amountBN.div(poolClone.supplied[0].token.totalSupply);

        position.token.underlying = position.token.underlying.map((token) => {
          const tokenBalance = poolShare.times(token.reserve);
          const tokenBalanceUSD = tokenBalance.times(token.price);
          return {
            ...token,
            balance: tokenBalance.toNumber(),
            value: tokenBalanceUSD.toNumber(),
          };
        });

        const result: ISupplyTokenUserEntry = {
          ...position,
          amount: amountBN.toNumber(),
          value: amountUSD.toNumber(),
        };
        return result;
      });

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
    const userData = new Map(data.map((b) => [b.address, b.liquidity]));
    return userData;
  }

  protected formatOpportunity(
    opportunity: IBalancerPoolMinimal,
    tokens: TokenMap,
  ): IPoolFeatureOpportunity {
    if (opportunity.supplied.some((t) => !tokens.has(t.token.address))) {
      const message = `Failed to resolve some tokens for pool - ${opportunity.chain}/${opportunity.id}`;
      throw new Error(message);
    }
    const supplied = opportunity.supplied.map((poolToken) =>
      this.formatSuppliedToken(poolToken, tokens),
    );

    return {
      id: opportunity.id,
      chain: opportunity.chain,
      feature: this.meta.feature,
      supplied: supplied,
    };
  }

  protected formatSuppliedToken(
    poolToken: IBalancerSupplyTokenMinimal,
    tokens: TokenMap,
  ): ISupplyTokenOpportunity {
    const underlying = poolToken.token.underlying?.map((token) => {
      return {
        ...tokens.get(token.address),
        reserve: Number(token.reserve),
      };
    });

    const token = tokens.get(poolToken.token.address);
    token.underlying = underlying;
    if (token.price === 0) {
      const tvl = underlying.reduce(
        (prev, next) => prev.plus(new BN(next.reserve).times(next.price)),
        new BN(0),
      );
      token.price = tvl.div(poolToken.totalSupplied).toNumber();
    }

    return {
      token,
      totalSupplied: +poolToken.totalSupplied,
      tvl: +poolToken.totalSupplied * token.price,
    };
  }

  /** TODO: need to move out reserve from TMinimal  */
  private toFeatureEntryMinimal(pool: Pool): IBalancerPoolMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: pool.address,
            underlying: pool.tokens.map((token) => {
              return {
                address: token.address,
                reserve: token.balance,
              };
            }),
          },
          totalSupplied: pool.totalShares,
        },
      ],
    };
  }
}
