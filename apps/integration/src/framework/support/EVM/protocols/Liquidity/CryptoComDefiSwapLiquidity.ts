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
import { INamedFunctionPredicates, TokenMap } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export class CryptoComDefiSwapLiquidity extends SingleContractProtocol<
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

    return poolsList.map((poolInfo) => {
      return {
        id: poolInfo,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          // Will fill in during hydration
        ],
      };
    });
  }

  protected formatOpportunity(
    opportunity: IPoolFeatureMinimal,
    tokens: TokenMap,
  ): void | IPoolFeatureOpportunity {
    // const base: Partial<TOpportunity> = { // TODO: 'token' isn't yet on TOpportunity
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      meta: opportunity.meta,
      interactive: opportunity.interactive,
    };

    const lpToken = tokens.get(opportunity.id);

    // If there are no underlying tokens for this liquidity pool, skip for now
    // asset service will fetch details if possible and fill in at a later time
    if (!lpToken.underlying) return;

    const receipt = this.formatOpportunityReceiptToken(opportunity, lpToken, tokens);
    if (receipt) {
      base.token = receipt;
    }

    // fill & format supplied tokens
    base.supplied = lpToken.underlying?.map((token) => {
      return {
        token,
        tvl: token.reserve * token.price,
      };
    });

    return base;
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
        try {
          return this.formatUserData(address, p, userBalances);
        } catch (err) {
          this.logger.warn(err);
        }
      })
      .filter((u) => !!u);
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

    const poolShare = new BN(balanceNormalized).div(pool.token.totalSupply);
    const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((token) => {
      const tokenBalance = poolShare.times(token.token.reserve);
      const tokenBalanceUSD = tokenBalance.times(token.token.price);
      return {
        ...token,
        amount: tokenBalance.toNumber(),
        value: tokenBalanceUSD.toNumber(),
      };
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
