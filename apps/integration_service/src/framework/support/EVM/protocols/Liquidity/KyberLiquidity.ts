import { CurrentPricesPayload } from 'apps/integration_service/src/common/dto';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

const getReservesABI: AbiItem = {
  inputs: [],
  name: 'getReserves',
  outputs: [
    { internalType: 'uint112', name: '', type: 'uint112' },
    { internalType: 'uint112', name: '', type: 'uint112' },
  ],
  stateMutability: 'view',
  type: 'function',
};

export class KyberLiquidity extends SingleContractProtocol<
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
    allPools: () => (item) => item.name === 'allPools',
    allPoolsLength: () => (item) => item.name === 'allPoolsLength',
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

    return poolsList.map((poolInfo, idx) => ({
      id: poolInfo.toLowerCase(),
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
    }));
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

      tokenSupplied.token.underlying = tokenSupplied.token.underlying?.map((token) => {
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

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      const calls = new Map();
      tokens.forEach((token: any) => {
        if (token.underlyingAssets?.length !== 2) return;
        const contract = new UniswapV2Pair(token.address);
        calls.set(`${token.address}.totalSupply()`, contract.totalSupply());
        calls.set(
          `${token.address}.getReserves()`,
          plainToClass(CallData, {
            address: token.address,
            abi: getReservesABI,
            input: {},
          }),
        );
        calls.set(`${token.address}.token0()`, contract.token0());
        calls.set(`${token.address}.token1()`, contract.token1());
        token.underlyingAssets.forEach((asset) => {
          const c = new ERC20(asset.address);
          calls.set(`${asset.address}.totalSupply()`, c.totalSupply());
        });
      });
      const results = await this.multicall.handleInBatches(calls, this.meta.chain);
      tokens.forEach((token: any) => {
        if (token.underlyingAssets?.length !== 2) return;
        const totalSupply = results.get(`${token.address}.totalSupply()`).output.data;
        const token0Address = results.get(`${token.address}.token0()`).output.data.toLowerCase();
        const token1Address = results.get(`${token.address}.token1()`).output.data.toLowerCase();
        const { 0: _reserve0, 1: _reserve1 } = results.get(`${token.address}.getReserves()`).output
          .data;
        if (!Number(prices[token0Address]) && !Number(prices[token1Address])) return;

        // calculate/fill in missing base token prices based on current LP reserves
        if (!prices[token0Address]) {
          prices[token0Address] = _reserve1.times(prices[token1Address]).div(_reserve0);
        }
        if (!prices[token1Address]) {
          prices[token1Address] = _reserve1.times(prices[token0Address]).div(_reserve1);
        }

        // calculate/fill the LP token price into the price array
        const tvl0 = _reserve0.times(prices[token0Address]);
        const tvl1 = _reserve1.times(prices[token1Address]);

        token.totalSupply = normalizeDecimals(totalSupply, token.decimals);

        prices[token.address] = new BN(tvl0.plus(tvl1).toString()) //
          .div(totalSupply)
          .toNumber();
        token.underlyingAssets.forEach((u) => {
          u.totalSupply = normalizeDecimals(
            results.get(`${u.address}.totalSupply()`).output.data,
            u.decimals,
          );

          u.reserve = normalizeDecimals(
            (u.reserve = u.positionInPool === 0 ? _reserve0 : _reserve1).toString(),
            u.decimals,
          );
        });
      });
      return tokens;
    } catch (err) {
      // TODO: delete this block, Prices should come from asset service, not calculated here
      this.logger.error(err.message, err.stack, 'EVMCore');
      return tokens;
    }
  }
}

function userBalanceLabel(lpAddress, userAddress): string {
  return concatStrings(lpAddress, userAddress);
}

function dataFrom(callsResult: Map<string, CallData>, label: string) {
  return callsResult.get(label).output.data;
}
