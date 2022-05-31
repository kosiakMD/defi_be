import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/call-data';
import { concatStrings, dataFrom, equals, normalizeDecimals, startsWith } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/erc20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { CurveAssetsManager } from '../../../assets/curve-assets.manager';
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
} from '../../../interfaces/feature-pool.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens-common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens-supplied.interface';
import { AbiService } from '../../abi-module/abi-service';
import { SingleContractProtocol } from '../../single-contract-protocol';

export interface IEllipsisLiquidityMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.pools;
  context: {
    aprUrl: string;
  };
  links: {
    getOpportunityLink: (opportunity) => string;
  };
}

export type EllipsisExtraData = {
  id: number;
  minter: string;
};
export type IPoolFeatureMinimalEllipsis = BaseWithTokens<
  ISupplyTokenMinimal[],
  void,
  void,
  EllipsisExtraData
>;

export class EllipsisLiquidity
  extends SingleContractProtocol<
    IPoolFeatureMinimalEllipsis,
    IPoolFeatureOpportunity,
    IPoolFeatureUser,
    IEllipsisLiquidityMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected assetsManager: CurveAssetsManager,
    protected httpService: HttpService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    registeredTokens: () => (item) => equals(item.name, 'registeredTokens'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = parseInt(context.poolLength, 10);
    return context;
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IPoolFeatureMinimalEllipsis[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());
    const registeredTokens: Address[] = await this.fetchRegisteredTokens(poolIds);
    const minters: string[] = await this.assetsManager.fetchMinters(
      registeredTokens,
      this.meta.chain,
    );
    return registeredTokens.map((registeredToken, idx) => {
      return {
        id: registeredToken,
        chain: this.meta.chain,
        feature: this.meta.feature,
        token: {
          address: registeredToken,
        },
        // not possible to set supplied tokens here
        supplied: [],
        meta: {
          id: poolIds[idx],
          minter: minters[idx],
        },
      };
    });
  }

  protected formatOpportunity(
    opportunity: IPoolFeatureMinimalEllipsis,
    tokens: TokenMap,
  ): void | IPoolFeatureOpportunity {
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      token: this.formatOpportunityReceiptToken(opportunity, tokens.get(opportunity.id), tokens),
    };
    base.supplied = this.formatSuppliedTokens(tokens.get(opportunity.id));

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

  protected async fetchRegisteredTokens(poolIds: number[]): Promise<string[]> {
    const registeredTokensCalls = poolIds.map((poolId) =>
      this.getMainContract().createCall(this.functions.registeredTokens, poolId),
    );
    const registeredTokens = await this.multicall.callArray(registeredTokensCalls, this.meta.chain);
    return registeredTokens.map((tAddress) => tAddress.toLowerCase());
  }

  protected async getTokens(addresses: Address[]): Promise<[Address, ERC20Token][]> {
    return await this.assetsManager.getTokens(addresses, this.meta.chain);
  }

  protected async fetchUserData(address: Address, pools: IPoolFeatureOpportunity[]): Promise<any> {
    const calls: Map<string, CallData> = new Map<string, CallData>();
    pools.forEach((pool) => {
      calls.set(
        userBalanceLabel(pool.token.address, address),
        plainToClass(CallData, {
          address: pool.token.address,
          abi: ERC20.balanceOf,
          input: {
            data: [address],
          },
        }),
      );
    });
    const userBalances = await this.multicall.handleInBatches(calls, this.meta.chain);
    return pools
      .map((p) => {
        return this.formatUserData(address, p, userBalances);
      })
      .filter((u) => u !== undefined);
  }

  protected formatUserData(
    address: Address,
    pool: IPoolFeatureOpportunity,
    data: Map<string, CallData>,
  ): IPoolFeatureUser {
    const userBalance: BN = dataFrom(data, userBalanceLabel(pool.token.address, address));
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
        const underlyingLpShare = tSupplied.amount / tokenSupplied['totalSupply'];
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

function userBalanceLabel(lpAddress, userAddress): string {
  return concatStrings(lpAddress, userAddress);
}
