import { UniswapV2AssetService } from 'apps/integration/src/modules/microservices/uniswap.asset.service';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MissingTokenException, MissingUnderlyingException } from '../../../exceptions';
import {
  IProtocolMeta,
  IRootProtocol,
  IUserDataProtocolResponse,
  TokenMap,
} from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { EVMCore } from '../../EVMCore';
import {
  BALANCES_QUERY,
  IUniswapBalanceSubgraphResponse,
  POOLS_QUERY,
} from '../../Subgraphs/UniswapSubgraph';

export type IUniswapVaultMeta = IProtocolMeta & {
  ammSubgraphUrl: string;
};

export class UniswapV2Liquidity
  extends EVMCore<IPoolFeatureMinimal, IPoolFeatureOpportunity, IPoolFeatureUser, IUniswapVaultMeta>
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: UniswapV2AssetService,
    protected httpService: HttpService,
    // only used to get totalSupply
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  /**
   * Get longer term cacheable info
   */
  async getCacheableOpportunityData(): Promise<IPoolFeatureMinimal[]> {
    const $data = this.httpService
      .post(this.meta.ammSubgraphUrl, {
        query: POOLS_QUERY,
      })
      .pipe(
        mergeMap((rsp) => rsp.data.data.pairs),
        map((pool) => this.toFeatureEntryMinimal(pool)),
        toArray(),
      );
    return firstValueFrom($data);
  }

  private toFeatureEntryMinimal(pool): IPoolFeatureMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: [
        { token: { address: pool.token0.address } },
        { token: { address: pool.token1.address } },
      ],
    };
  }

  formatOpportunity(
    opportunity: IPoolFeatureMinimal,
    tokens: TokenMap,
  ): void | IPoolFeatureOpportunity {
    const receipt = this.formatOpportunityReceiptToken(
      opportunity,
      tokens.get(opportunity.id),
      tokens,
    );
    if (!receipt) {
      throw new MissingTokenException(opportunity.token, opportunity, this.meta.chain);
    }
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      meta: opportunity.meta,
      token: receipt,
    };

    const supplied = tokens.get(opportunity.id).underlying;
    if (!supplied || supplied.length < 2) {
      throw new MissingUnderlyingException(opportunity.token, this.meta.chain);
    }
    base.supplied = supplied.map((poolToken) => {
      return this.formatOpportunitySuppliedSingleToken(poolToken);
    });
    return base;
  }

  protected formatOpportunitySuppliedSingleToken(token: ERC20Token): ISupplyTokenOpportunity {
    if (!token) {
      return undefined;
    }
    const formattedToken = cloneDeep(token);
    delete formattedToken.totalSupply;
    delete formattedToken.reserve;
    delete formattedToken.position;
    return {
      token: formattedToken,
      totalSupplied: Number(token.reserve),
      tvl: Number(token.reserve) * token.price,
    };
  }

  async getUsersData(addresses: string[]): Promise<IUserDataProtocolResponse<IPoolFeatureUser>> {
    const { data: pools, errors } = await this.getPoolData();
    const wallets = new Map();
    const poolsMap = new Map(pools.map((p) => [p.id, p]));
    try {
      const balances = await this.getSubgraphAccountBalances(addresses);
      for (const balance of balances) {
        if (!poolsMap.has(balance.pair)) {
          continue;
        }

        const data = this.calculateBalances(poolsMap.get(balance.pair), {
          balance: balance.balance,
          address: balance.user,
        });

        if (!wallets.has(balance.user)) {
          wallets.set(balance.user, []);
        }
        wallets.get(balance.user).push(data);
      }
    } catch (err) {
      errors.push(err);
    }

    return { data: wallets, errors };
  }

  private async getSubgraphAccountBalances(addresses: string[]) {
    const $data = this.httpService
      .post<IUniswapBalanceSubgraphResponse>(this.meta.ammSubgraphUrl, {
        query: BALANCES_QUERY,
        variables: { addresses },
      })
      .pipe(
        mergeMap((rsp) => rsp.data.data.balances),
        map((b) => {
          const [pair, user] = b.id.split('-');
          return {
            pair,
            user,
            balance: b.balance,
          };
        }),
        toArray(),
      );

    return firstValueFrom($data);
  }

  protected calculateBalances(
    pool: IPoolFeatureOpportunity,
    balance: { balance: string; address: string },
  ): IPoolFeatureUser {
    const poolShare = Number(balance.balance) / pool.token.totalSupply;

    const token = {
      ...pool.token,
      amount: Number(balance.balance),
      value: Number(balance.balance) * pool.token.price,
    };

    const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((tokenSupplied) => {
      return {
        ...tokenSupplied,
        amount: poolShare * tokenSupplied.totalSupplied,
        value: tokenSupplied.token.price * poolShare * tokenSupplied.totalSupplied,
        token: {
          ...tokenSupplied.token,
        },
      };
    });

    return {
      ...pool,
      token: token,
      supplied,
    };
  }
}
