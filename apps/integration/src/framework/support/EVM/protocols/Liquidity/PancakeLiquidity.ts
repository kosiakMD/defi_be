import { UniswapV2AssetService } from 'apps/integration/src/modules/microservices/uniswap.asset.service';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { cloneDeep } from 'lodash';
import { firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { gql, normalizeDecimals } from '@app/common/utils';
import { toChunkedArray } from '@app/common/utils/transform';
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

export type ICakePoolMeta = IProtocolMeta & {
  ammSubgraphUrl: string;
  wrappedTokenAddress: string;
  minUSDPairReserve: number;
  pairsPerQuery: number;
  balanceCallsPerQuery: number;
};

const balanceOfAbi = {
  constant: true,
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  payable: false,
  stateMutability: 'view',
  type: 'function',
};

export const POOLS_LIST_0 = gql`
  query ($first: Int!, $skip: Int!, $token0: String!, $minTokenReserve: BigDecimal!) {
    pairs(first: $first, skip: $skip, where: { token0: $token0, reserve0_gt: $minTokenReserve }) {
      address: id
      token0 {
        address: id
      }
      token1 {
        address: id
      }
    }
  }
`;

export const POOLS_LIST_1 = gql`
  query ($first: Int!, $skip: Int!, $token1: String!, $minTokenReserve: BigDecimal!) {
    pairs(first: $first, skip: $skip, where: { token1: $token1, reserve1_gt: $minTokenReserve }) {
      address: id
      token0 {
        address: id
      }
      token1 {
        address: id
      }
    }
  }
`;

export class PancakeLiquidity
  extends EVMCore<IPoolFeatureMinimal, IPoolFeatureOpportunity, IPoolFeatureUser, ICakePoolMeta>
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: UniswapV2AssetService,
    protected httpService: HttpService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<IPoolFeatureMinimal[]> {
    const wrappedToken = await this.assetService.getAsset(
      this.meta.wrappedTokenAddress,
      this.meta.chain,
    );

    const wrappedTokenPrice = wrappedToken.price;
    if (!wrappedTokenPrice) {
      throw new Error(`Not possible to get wrapped token price ${this.meta.wrappedTokenAddress}.`);
    }
    const minTokenReserve = this.meta.minUSDPairReserve / wrappedTokenPrice;
    const resultWithToken0 = await this.loadDataPartially(
      POOLS_LIST_0,
      this.meta.pairsPerQuery,
      {
        token0: this.meta.wrappedTokenAddress.toLowerCase(),
        minTokenReserve: minTokenReserve,
      },
      'pairs',
    );
    const resultWithToken1 = await this.loadDataPartially(
      POOLS_LIST_1,
      this.meta.pairsPerQuery,
      {
        token1: this.meta.wrappedTokenAddress.toLowerCase(),
        minTokenReserve: minTokenReserve,
      },
      'pairs',
    );
    return [...resultWithToken0, ...resultWithToken1].map((pool) =>
      this.toFeatureEntryMinimal(pool),
    );
  }

  private async loadDataPartially(rawQuery, numberPerQuery, variables, path) {
    let collectedData = [];
    let responseSize = numberPerQuery;
    let skip = 0;
    do {
      const $data = this.httpService
        .post(this.meta.ammSubgraphUrl, {
          query: rawQuery,
          variables: {
            ...variables,
            first: this.meta.pairsPerQuery,
            skip: skip,
          },
        })
        .pipe(
          mergeMap((rsp) => rsp.data.data[path]),
          toArray(),
        );
      const result = await firstValueFrom($data);
      skip += this.meta.pairsPerQuery;
      responseSize = result.length;
      collectedData = collectedData.concat(result);
    } while (responseSize === this.meta.pairsPerQuery);
    return collectedData;
  }

  private toFeatureEntryMinimal(pool): IPoolFeatureMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      token: {
        address: pool.address,
      },
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

  balanceOfLabel(tokenAddress, userAddress) {
    return `${tokenAddress}_${userAddress}`;
  }

  async getUsersData(addresses: string[]): Promise<IUserDataProtocolResponse<IPoolFeatureUser>> {
    const { data: pools, errors } = await this.getPoolData();

    const chainCalls: { id: string; call: CallData }[] = [];
    addresses.forEach((a) => {
      pools.forEach((p) => {
        chainCalls.push({
          id: this.balanceOfLabel(p.id, a),
          call: plainToClass(CallData, {
            address: p.id,
            abi: balanceOfAbi,
            input: {
              data: [a],
            },
          }),
        });
      });
    });
    const callsChunked = toChunkedArray(chainCalls, this.meta.balanceCallsPerQuery);
    const results = await Promise.all(
      callsChunked.map((calls) => {
        return this.multicall.handleInBatches(
          new Map<string, CallData>(
            calls.map((cd) => {
              return [cd.id, cd.call];
            }),
          ),
          this.meta.chain,
        );
      }),
    );

    const wallets = new Map();
    const poolsMap = new Map(pools.map((p) => [p.id, p]));
    try {
      const balances = [];
      results.forEach((callsChunk) => {
        callsChunk.forEach((value, key) => {
          const balance = normalizeDecimals(value.output.data.toString(), 18);
          if (balance > 0) {
            const [pair, user] = key.split('_');
            balances.push({
              pair,
              user,
              balance: normalizeDecimals(value.output.data.toString(), 18),
            });
          }
        });
      });
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
