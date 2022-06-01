import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export class DefiSwapLiquidity extends SingleContractProtocol<
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
    protected httpService: HttpService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    allPools: () => (item) => item.name === 'allPairs',
    allPoolsLength: () => (item) => item.name === 'allPairsLength',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IPoolFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.allPoolsLength.toNumber()).keys());
    const poolsList = await this.fetchRegisteredPools(poolIds);

    const totalStakedPerPool = await this.multicall.callArray(
      poolsList.map((p) => {
        const lp = new ERC20(p);
        return lp.totalSupply();
      }),
      this.meta.chain,
    );

    return poolsList.map((poolInfo, idx) => {
      return {
        id: poolInfo,
        chain: this.meta.chain,
        feature: this.meta.feature,
        token: {
          address: poolInfo,
        },
        supplied: [
          {
            token: {
              address: poolInfo,
            },
            totalSupplied: totalStakedPerPool[idx].toString(),
          },
        ],
      };
    });
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

  protected async fetchRegisteredPools(poolIds: number[]): Promise<string[]> {
    const registeredPoolsCalls = poolIds.map((poolId) =>
      this.getMainContract().createCall(this.functions.allPools, poolId),
    );
    const registeredTokens = await this.multicall.callArray(registeredPoolsCalls, this.meta.chain);
    return registeredTokens.map((tAddress) => tAddress.toLowerCase());
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
