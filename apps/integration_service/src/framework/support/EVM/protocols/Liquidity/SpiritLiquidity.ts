import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals, startsWith } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { CurveAssetsManager } from '../../../assets/curve.assets.manager';
import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  ISupplyTokenMinimal,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

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

export class SpiritLiquidity extends SingleContractProtocol<
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser
> {
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
    allPairsLength: () => (item) => startsWith(item.name, 'allPairsLen'),
    allPairs: () => (item) => startsWith(item.name, 'allPairs'),
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IPoolFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.allPairsLength.toNumber()).keys());
    const registeredTokens: Address[] = await this.fetchRegisteredTokens(poolIds);
    const results = registeredTokens.map((registeredToken) => {
      return {
        id: registeredToken,
        chain: this.meta.chain,
        feature: this.meta.feature,
        token: {
          address: registeredToken,
        },
        supplied: [
          {
            token: {
              address: registeredToken,
            },
            totalSupplied: null,
          },
        ],
      };
    });
    return results;
  }

  protected async fetchRegisteredTokens(poolIds: number[]): Promise<string[]> {
    const registeredTokensCalls = poolIds.map((poolId) =>
      this.getMainContract().createCall(this.functions.allPairs, poolId),
    );
    const registeredTokens = await this.multicall.callArray(registeredTokensCalls, this.meta.chain);
    return registeredTokens.map((tAddress) => tAddress.toLowerCase());
  }

  protected async fetchUserData(
    address: string,
    pools: IPoolFeatureOpportunity[],
  ): Promise<IPoolFeatureUser[]> {
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

    const poolShare = new BN(balanceNormalized).div(pool.supplied[0].token.totalSupply);
    const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((tokenSupplied) => {
      const amountUSD = new BN(balanceNormalized).times(tokenSupplied.token.price);

      tokenSupplied.token.underlying = tokenSupplied.token.underlying.map((token) => {
        const tokenBalance = poolShare.times(token.reserve);
        const tokenBalanceUSD = tokenBalance.times(token.price);
        return {
          ...token,
          balance: tokenBalance.toNumber(),
          value: tokenBalanceUSD.toNumber(),
        };
      });

      const result: ISupplyTokenUserEntry = {
        ...tokenSupplied,
        amount: balanceNormalized,
        value: amountUSD.toNumber(),
      };
      return result;
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

function dataFrom(callsResult: Map<string, CallData>, label: string) {
  return callsResult.get(label).output.data;
}
