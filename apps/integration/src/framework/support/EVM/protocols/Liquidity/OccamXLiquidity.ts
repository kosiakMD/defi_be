import { UniswapV2AssetService } from 'apps/integration/src/modules/microservices/uniswap.asset.service';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { RpcService } from '../../../../../modules/microservices/rpc.service';
import { IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import { IPoolFeatureUser } from '../../../interfaces/feature.pool.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { OccamXBase } from '../../Bases/OccamX/OccamXBase';
import { IOccamXPool, IOccamXProtocolMeta } from '../../Bases/OccamX/occamx.interfaces';
import { IExtendedPool } from '../../Subgraphs/OccamXSubgraph';

interface IOccamXMeta {
  tvl: string;
  lpTotalSupply: string;
  lpPrice: string;
}

type IOccamXPoolFeatureMinimal = BaseWithTokens<ISupplyTokenMinimal[], void, void, IOccamXMeta>;

type IOccamXPoolFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  void,
  void,
  IOccamXMeta
>;

export class OccamXLiquidity
  extends OccamXBase<
    IOccamXPoolFeatureMinimal,
    IOccamXPoolFeatureOpportunity,
    IPoolFeatureUser,
    IOccamXProtocolMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(CACHE_MANAGER) protected cache: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly multicall: MulticallAggregator,
    protected assetService: UniswapV2AssetService,
    protected httpService: HttpService,
    protected web3Service: Web3ProviderService,
    protected rpcService: RpcService,
    protected abiService: AbiService,
  ) {
    super();
  }

  async fetchOpportunityData(): Promise<IOccamXPoolFeatureMinimal[]> {
    return (await this.fetchAllPools()).map(this.toFeatureMinimal.bind(this));
  }

  async fetchUsersData(addresses: Address[]): Promise<IUserDataProtocolResponse<IPoolFeatureUser>> {
    const data = new Map<string, IPoolFeatureUser[]>(addresses.map((address) => [address, []]));
    const errors: Error[] = [];

    for await (const [address] of data) {
      const pools = (await this.fetchUserPools(address)).filter((pool) =>
        new BN(pool.stakingBalance).toNumber(),
      );

      const extendedPools = await Promise.all(
        pools.map(
          async (pool) =>
            await this.fetchUserLiquidityPosition(this.toUserLPSubgraphVariables(address, pool)),
        ),
      );

      const cachedPools = new Map((await this.getPoolData()).data.map((pool) => [pool.id, pool]));
      data.set(
        address,
        extendedPools
          .map((extendedPool) => this.toPoolFeature(extendedPool, cachedPools))
          .filter((pool) => pool?.token?.value),
      );
    }

    return { data, errors };
  }

  formatUserData(
    address: string,
    pool: IOccamXPoolFeatureOpportunity,
    data: IUserDataProtocolResponse<IPoolFeatureUser>,
  ): IPoolFeatureUser {
    return data.data.get(address).find(({ id }) => pool.id === id);
  }

  private toFeatureMinimal(pool: IOccamXPool): IOccamXPoolFeatureMinimal {
    return {
      id: pool.liquidity_token.contract,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        { token: { address: pool.token_0.contract } },
        { token: { address: pool.token_1.contract } },
      ],
      meta: {
        tvl: new BN(pool.tvl).toString(),
        lpTotalSupply: new BN(pool.total_supply).toString(),
        lpPrice: new BN(pool.price_lt).toString(),
      },
    };
  }

  private toPoolFeature(
    extendedPool: IExtendedPool,
    cachedPools: Map<string, IOccamXPoolFeatureOpportunity>,
  ): IPoolFeatureUser {
    const cachedPool = cachedPools.get(extendedPool.commonData.stakingToken.address);

    const lpTokenAmount = new BN(extendedPool.accountData.walletBalance).toNumber();
    const lpTokenValue = new BN(cachedPool.meta.lpPrice) //
      .multipliedBy(lpTokenAmount)
      .toNumber();

    return {
      chain: this.meta.chain,
      feature: this.meta.feature,
      id: extendedPool.commonData.stakingToken.address,
      links: this.meta.links,
      token: {
        address: extendedPool.commonData.stakingToken.address,
        name: extendedPool.commonData.stakingToken.name,
        symbol: extendedPool.commonData.stakingToken.symbol,
        decimals: extendedPool.commonData.stakingToken.decimals,
        totalSupply: new BN(extendedPool.commonData.stakingToken.totalSupply).toNumber(),
        amount: lpTokenAmount,
        price: new BN(cachedPool.meta.lpPrice).toNumber(),
        value: lpTokenValue,
      },
      supplied:
        cachedPool?.supplied.map(({ token }) => {
          const value = new BN(lpTokenValue) //
            .div(2)
            .toNumber();

          return {
            token: {
              id: null,
              address: token.address,
              chainId: this.meta.chain,
              decimals: token.decimals,
              name: token.name,
              symbol: token.symbol,
              price: token.price,
              categories: null,
              underlying: null,
            },
            value,
            amount: new BN(lpTokenValue) //
              .div(2)
              .div(token.price)
              .toNumber(),
            tvl: new BN(token.price) //
              .multipliedBy(value)
              .toNumber(),
          };
        }) || [],
    };
  }
}
