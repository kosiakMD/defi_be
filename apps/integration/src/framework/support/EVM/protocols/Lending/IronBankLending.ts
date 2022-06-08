import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { equals } from 'class-validator';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  IUserDataProtocolResponse,
} from '../../../interfaces';
import {
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
} from '../../../interfaces/feature.lending.interface';
import { IBorrowTokenUserEntity } from '../../../interfaces/tokens.borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { EVMCore } from '../../EVMCore';

export interface IronBankMeta extends IProtocolMeta {
  apiEndpoint: string;
}

export class IronBankLending
  extends EVMCore<
    ILendingFeatureEntryMinimal,
    ILendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    IronBankMeta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: FakeAssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<ILendingFeatureEntryMinimal[]> {
    const apiResults = await this.getCachedITokensMarketsInfo();

    return apiResults.map((res: any) => {
      return {
        id: res.token_address.toLowerCase(),
        chain: this.meta?.chain,
        debtRatio: 0,
        feature: FeatureEnum.lending,
        supplied: [
          {
            token: { address: res.underlying_address.toLowerCase() },
            // eslint-disable-next-line newline-per-chained-call
            totalSupplied: new BN(res.cash.value).plus(new BN(res.total_borrows.value)).toString(),
            apy: { year: +res.supply_apy.value },
          },
        ],
        borrowed: [
          {
            token: { address: res.underlying_address.toLowerCase() },
            totalBorrowed: res.total_borrows.value,
            apy: { year: +res.borrow_apy.value },
          },
        ],
      };
    });
  }

  protected formatOpportunitySuppliedToken(
    supplied: any,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = +supplied.totalSupplied;

    return {
      token,
      apy: supplied.apy,
      tvl: totalSupplied * token.price,
    };
  }

  protected formatOpportunityBorrowedToken(
    borrowed: any,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalBorrowed = +borrowed.totalBorrowed;

    return {
      token,
      apy: borrowed.apy,
      tvl: totalBorrowed * token.price,
    };
  }

  private async getCachedITokensMarketsInfo() {
    return this.getOrSet(
      60 * 60 * 24,
      'avalanche_token_config_response' + this.meta.chain,
      async () => {
        return (
          await firstValueFrom(
            this.httpService.get(
              this.meta.apiEndpoint + 'itoken?comptroller=' + this.getNetworkSlug(),
            ),
          )
        ).data;
      },
    );
  }

  private getNetworkSlug() {
    switch (this.meta.chain) {
      case ChainIdEnum.avax: {
        return 'avalanche';
      }
      case ChainIdEnum.ftm: {
        return 'fantom';
      }
      case ChainIdEnum.eth: {
        return 'eth';
      }
      default: {
        this.logger.log('Unsupported chain' + this.meta.chain);
        throw new Error('Unsupported chain' + this.meta.chain);
      }
    }
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<ILendingFeatureUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();
    const wallets: Map<string, ILendingFeatureUserEntry[]> = new Map();
    const combinedErrors = [...errors];

    const iTokenPredicates: INamedFunctionPredicates = {
      borrowBalance: () => (item) => equals(item.name, 'borrowBalanceCurrent'),
      supplyBalance: () => (item) => equals(item.name, 'balanceOfUnderlying'),
      reserveFactorMantissa: () => (item) => equals(item.name, 'reserveFactorMantissa'),
    };

    const iTokenFunctions = await this.abiService.parseFunctionsFromAddress(
      '0xb3c68d69E95B095ab4b33B4cB67dBc0fbF3Edf56',
      ChainIdEnum.avax,
      iTokenPredicates,
      ['nonpayable', 'view', 'pure'],
    );

    for (const address of addresses) {
      const suppliedCalls = [];
      const borrowedCalls = [];
      const reserveFactorCalls = [];

      let totalBorrowedValue = new BN(0);
      let totalSuppliedValueWithReserveFactored = new BN(0);
      // outstanding borrows divided by collateral value is less than the provided amount.
      for (const pool of pools) {
        suppliedCalls.push(
          new DynamicContract(pool.id).createCall(iTokenFunctions.supplyBalance, address),
        );
        borrowedCalls.push(
          new DynamicContract(pool.id).createCall(iTokenFunctions.borrowBalance, address),
        );
        reserveFactorCalls.push(
          new DynamicContract(pool.id).createCall(iTokenFunctions.reserveFactorMantissa),
        );
      }
      const suppliedByUserPerPool = await this.multicall.callArray(suppliedCalls, this.meta.chain);
      const borrowedByUserPerPool = await this.multicall.callArray(borrowedCalls, this.meta.chain);
      const reserveFactorPerPool = (
        await this.multicall.callArray(reserveFactorCalls, this.meta.chain)
      ).map((x) => normalizeDecimals(x, 18));

      const suppliedTokens: ISupplyTokenUserEntry[] = [];
      const borrowedTokens: IBorrowTokenUserEntity[] = [];

      pools.forEach((pool, ind) => {
        const suppliedForPool = suppliedByUserPerPool[ind];
        const borrowedForPool = borrowedByUserPerPool[ind];

        const token = pool.supplied[0];

        const reserveFactor = reserveFactorPerPool[ind];

        if (suppliedForPool.gt(new BN(0))) {
          const normalizedSupplyAmount = normalizeDecimals(
            suppliedForPool.toString(),
            token.token.decimals,
          );
          const supplyValueBn = new BN(normalizedSupplyAmount).multipliedBy(
            new BN(token.token.price),
          );
          totalSuppliedValueWithReserveFactored = totalSuppliedValueWithReserveFactored.plus(
            supplyValueBn.multipliedBy(new BN(1).minus(new BN(reserveFactor))),
          );

          suppliedTokens.push({
            ...token,
            amount: normalizedSupplyAmount,
            value: supplyValueBn.toNumber(),
          });
        }

        if (borrowedForPool.gt(new BN(0))) {
          const normalizedBorrowAmount = normalizeDecimals(
            borrowedForPool.toString(),
            token.token.decimals,
          );
          const borrowValueBn = new BN(normalizedBorrowAmount).multipliedBy(
            new BN(token.token.price),
          );
          totalBorrowedValue = totalBorrowedValue.plus(borrowValueBn);

          borrowedTokens.push({
            ...token,
            apy: pool.borrowed[0].apy,
            tvl: pool.borrowed[0].tvl,
            amount: normalizedBorrowAmount,
            value: borrowValueBn.toNumber(),
          });
        }
      });
      const debtRatio = totalSuppliedValueWithReserveFactored
        .dividedBy(totalBorrowedValue)
        .toNumber();

      wallets.set(address, [
        {
          id: 'iron-bank-lending',
          chain: this.meta.chain,
          feature: FeatureEnum.lending,
          supplied: suppliedTokens,
          borrowed: borrowedTokens,
          rewarded: [],
          debtRatio,
        },
      ]);
    }

    return { data: wallets, errors: combinedErrors };
  }
}
