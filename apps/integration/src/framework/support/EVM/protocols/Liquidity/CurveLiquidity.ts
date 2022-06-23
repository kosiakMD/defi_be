import { EllipsisAssetService } from 'apps/integration/src/modules/microservices/ellipsis.asset.service';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { CurveAssetsManager } from '../../../assets/curve.assets.manager';
import { FeatureEnum } from '../../../enums';
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import {
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface ICurveLiquidityMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.pools;
}

export type CurveExtraData = {
  id: number;
  minter: string;
};
export type ICurvePoolFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  void,
  void,
  CurveExtraData
>;

export class CurveLiquidity
  extends SingleContractProtocol<
    ICurvePoolFeatureMinimal,
    IPoolFeatureOpportunity,
    IPoolFeatureUser,
    ICurveLiquidityMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    protected assetService: EllipsisAssetService,
    protected assetsManager: CurveAssetsManager,
    protected httpService: HttpService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => item.name === 'pool_count',
    poolList: () => (item) => item.name === 'pool_list',
    lpToken: () => (item) => item.name === 'get_lp_token',
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    return context;
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<ICurvePoolFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());
    const poolsInfos: { pool; lpToken }[] = await this.fetchPoolsData(poolIds);
    return poolsInfos.map((poolInfo, idx) => {
      return {
        id: poolInfo.pool,
        chain: this.meta.chain,
        feature: this.meta.feature,
        token: {
          address: poolInfo.lpToken,
        },
        // not possible to set supplied tokens here
        supplied: [],
        meta: {
          id: poolIds[idx],
          minter: null,
        },
      };
    });
  }

  protected getUniqueTokensFromRawPools(pools: ICurvePoolFeatureMinimal[]): Address[] {
    return pools.map((pool) => pool.token.address);
  }

  protected formatOpportunity(
    opportunity: ICurvePoolFeatureMinimal,
    tokens: TokenMap,
  ): void | IPoolFeatureOpportunity {
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      token: this.formatOpportunityReceiptToken(
        opportunity,
        tokens.get(opportunity.token.address),
        tokens,
      ),
    };
    base.supplied = this.formatSuppliedTokens(tokens.get(opportunity.token.address));

    return base;
  }

  protected formatSuppliedTokens(token: ERC20Token) {
    return token.underlying.map((tu) => {
      return {
        token: {
          address: tu.address,
          name: tu.name,
          symbol: tu.symbol,
          chainId: this.meta.chain,
          decimals: tu.decimals,
          price: tu.price,
          underlying: tu.underlying,
        },
        totalSupplied: tu.reserve,
        totalSupply: tu.totalSupply,
        tvl: tu.value,
      };
    });
  }

  protected async fetchPoolsData(poolIds: number[]): Promise<{ pool; lpToken }[]> {
    const contract = this.getMainContract();
    const poolsContracts = await this.multicall.callArray(
      poolIds.map((poolId) => contract.createCall(this.functions.poolList, poolId)),
      this.meta.chain,
    );

    const poolsLps = await this.multicall.callArray(
      poolsContracts.map((poolId) => contract.createCall(this.functions.lpToken, poolId)),
      this.meta.chain,
    );

    return poolsLps.map((lp, index) => ({
      pool: poolsContracts[index].toLowerCase(),
      lpToken: lp.toLowerCase(),
    }));
  }

  protected async fetchUserData(address: Address, pools: IPoolFeatureOpportunity[]): Promise<any> {
    const userBalances = await this.multicall.callArray(
      pools.map((pool) => {
        const contract = new ERC20(pool.token.address);
        return contract.balanceOf(address);
      }),
      this.meta.chain,
    );
    return pools
      .map((p, index) => {
        return this.formatUserData(address, p, userBalances[index]);
      })
      .filter((u) => u !== undefined);
  }

  protected formatUserData(
    address: Address,
    pool: IPoolFeatureOpportunity,
    userBalance: BN,
  ): IPoolFeatureUser {
    if (userBalance.isZero()) {
      return;
    }
    const balanceNormalized = normalizeDecimals(userBalance.toString(), pool.token.decimals);
    const token = {
      ...pool.token,
      amount: balanceNormalized,
      value: balanceNormalized * pool.token.price,
    };

    const poolShare = balanceNormalized / pool.token.totalSupply;
    const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((tokenSupplied) => {
      const tSupplied = {
        tvl: tokenSupplied.tvl,
        amount: poolShare * tokenSupplied.totalSupplied,
        value: tokenSupplied.token.price * poolShare * tokenSupplied.totalSupplied,
        token: {
          ...tokenSupplied.token,
        },
      };
      tSupplied.token.underlying = tokenSupplied.token.underlying?.map((tu) => {
        const underlyingLpShare = tSupplied.amount / tokenSupplied.totalSupply;
        return {
          ...tu,
          amount: underlyingLpShare * tu.reserve,
          value: underlyingLpShare * tu.reserve * tu.price,
        };
      });
      return tSupplied;
    });

    return {
      ...pool,
      token: token,
      supplied,
    };
  }
}
