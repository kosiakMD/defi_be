import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FeatureEnum } from '../../../enums';
import { MissingTokenException } from '../../../exceptions';
import { IProtocolMeta, IRootProtocol, TokenMap } from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { IRewardTokenMinimal } from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import {
  IBalancerPoolsResponse,
  IBalancerUsersYieldsResponse,
  Pool,
  POOL_QUERY,
  USERS_YIELDS,
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

type IBalancerStakingMinimal = BaseWithTokens<
  IBalancerSupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void,
  void
>;

export interface IBalancerVaultMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context: {
    endpoint: string;
    networkId: string;
    gaugesId: string;
  };
}

export class BalancerStaking
  extends SubgraphsContractProtocol<
    IBalancerStakingMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IBalancerVaultMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: FakeAssetService,
    protected httpService: HttpService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  get GQLEndpoint(): string {
    return new URL(this.meta.context.networkId, this.meta.context.endpoint).toString();
  }

  get GQLGaugesEndpoint(): string {
    return new URL(this.meta.context.gaugesId, this.meta.context.endpoint).toString();
  }

  async getCacheableOpportunityData(): Promise<IBalancerStakingMinimal[]> {
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

  protected formatUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
    usersData: UsersDataResponse,
  ): IStakingFeatureUserEntry[] {
    const result: IStakingFeatureUserEntry[] = [];
    const userData = usersData.get(address) || [];
    for (const { address, balance } of userData) {
      const pool = pools.find((p) => p.id === address);
      if (!pool) continue;

      const poolClone = cloneDeep(pool);

      const supplied: ISupplyTokenUserEntry[] = poolClone.supplied.map((position) => {
        const amountBN = new BN(balance);
        const amountUSD = amountBN.times(position.token.price);
        const poolShare = amountBN.div(position.totalSupplied);

        position.token.underlying = position.token.underlying?.map((token) => {
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

      result.push({ ...poolClone, supplied, rewarded: [] });
    }
    return result;
  }

  protected async fetchUserData(addresses: string[]): Promise<UsersDataResponse> {
    const $data = this.httpService
      .post<IBalancerUsersYieldsResponse>(this.GQLGaugesEndpoint, {
        query: USERS_YIELDS,
        variables: { addresses },
      })
      .pipe(
        mergeMap((response) => response.data.data.users),
        map((farm) => {
          return {
            address: farm.id,
            yields: farm.gaugeShares.map((share) => {
              return {
                address: share.gauge.poolAddress,
                balance: share.balance,
              };
            }),
          };
        }),
        toArray(),
      );
    const data = await firstValueFrom($data);
    return new Map(data.map((b) => [b.address, b.yields]));
  }

  protected formatOpportunity(
    opportunity: IBalancerStakingMinimal,
    tokens: TokenMap,
  ): IStakingFeatureOpportunity {
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
    };

    base.supplied = opportunity.supplied.map((poolToken) => {
      const token = tokens.get(poolToken.token.address);
      if (!token) {
        throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
      }

      return this.formatOpportunityToken(poolToken, token, tokens);
    });

    return base;
  }

  protected singlePoolCacheKey(poolId: number | string) {
    return `${this.meta.feature}_${this.meta.chain}_${poolId}`;
  }

  private formatOpportunityToken(
    supplied: IBalancerSupplyTokenMinimal,
    token: ERC20Token,
    tokens: TokenMap,
  ): ISupplyTokenOpportunity {
    const totalSupplied = +supplied.totalSupplied;
    const apy = this.formatSupplyApy?.(supplied);

    token.underlying = supplied.token.underlying?.map((token) => ({
      ...tokens.get(token.address),
      reserve: +token.reserve,
    }));

    if (!token.price) {
      token.price =
        token.underlying.reduce((prev, next) => prev + next.reserve * next.price, 0) /
        totalSupplied;
    }

    return {
      token,
      apy,
      totalSupplied,
      tvl: totalSupplied * token.price,
    };
  }

  /** TODO: need to move out reserve from TMinimal  */
  private toFeatureEntryMinimal(pool: Pool): IBalancerStakingMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      rewarded: [],
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
