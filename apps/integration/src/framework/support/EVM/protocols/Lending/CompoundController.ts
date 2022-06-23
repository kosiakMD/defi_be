import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CallData } from '@app/common/dto/CallData';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, INamedFunctions, IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from '../../../interfaces/tokens.borrowed.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

type ExtraLendingData = {
  ltv: number;
  exchangeRate: string;
};

export type ILendingFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  void,
  IBorrowTokenMinimal,
  ExtraLendingData
>;
export type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity,
  ExtraLendingData
>;
export type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  void,
  IBorrowTokenUserEntity[],
  void
> & { debtRatio: number };

export interface ICompoundControllerMeta extends IProtocolMeta {
  feature: FeatureEnum.lending;
  name: string;
  address: Address;
  context: {
    cToken: Address;
    nativeToken: Address;
  };
}

export class CompoundController extends SingleContractProtocol<
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
  ICompoundControllerMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
  ) {
    super();
  }

  async initialize() {
    this.functions = await this.abiService.parseFunctionsFromAddress(
      this.meta.address,
      this.meta.chain,
      this.functionPredicates,
    );

    if (this.cTokenPredicates) {
      this.cFunctions = await this.abiService.parseFunctionsFromAddress(
        this.meta.context.cToken,
        this.meta.chain,
        this.cTokenPredicates,
      );
    }
  }

  protected cFunctions: INamedFunctions = {};

  protected functionPredicates: INamedFunctionPredicates = {
    markets: () => (item) => item.name.includes('markets'),
    allMarkets: () => (item) => item.name.includes('AllMarkets'),
  };

  protected cTokenPredicates: INamedFunctionPredicates = {
    cash: () => (item) => item.name === 'getCash',
    underlying: () => (item) => item.name === 'underlying',
    totalSupply: () => (item) => item.name === 'totalSupply',
    totalBorrows: () => (item) => item.name === 'totalBorrows',
    exchangeRate: () => (item) => item.name === 'exchangeRateStored',

    supplied: () => (item) => item.name === 'balanceOf',
    borrowed: () => (item) => item.name === 'borrowBalanceStored',
  };

  protected async fetchOpportunityData(
    context: Record<string, any>,
  ): Promise<ILendingFeatureEntryMinimal[]> {
    const mainContract = this.getMainContract();
    const calls = new Map();
    for (const cToken of context.allMarkets) {
      const contract = new DynamicContract(cToken);

      calls.set(this.cash(cToken), contract.createCall(this.cFunctions.cash));
      if (cToken.toLowerCase() !== this.meta.context.nativeToken.toLowerCase()) {
        calls.set(this.underlying(cToken), contract.createCall(this.cFunctions.underlying));
      }
      calls.set(this.totalSupply(cToken), contract.createCall(this.cFunctions.totalSupply));
      calls.set(this.totalBorrows(cToken), contract.createCall(this.cFunctions.totalBorrows));
      calls.set(this.exchangeRate(cToken), contract.createCall(this.cFunctions.exchangeRate));

      calls.set(this.markets(cToken), mainContract.createCall(this.functions.markets, cToken));
    }

    const multiCallResponse = await this.multicall.handleInBatches(calls, this.meta.chain);

    return context.allMarkets.map((cToken: string) => {
      return this.toLendingFeatureEntryMinimal(cToken, multiCallResponse);
    });
  }

  protected async fetchUserData(
    address: string,
    pools: ILendingFeatureOpportunity[],
  ): Promise<ILendingFeatureUserEntry[]> {
    const data = await this.fetchUsersData(pools, address);

    const userSupplied: ISupplyTokenUserEntry[] = [];
    const userBorrowed: IBorrowTokenUserEntity[] = [];
    let userTotalSupplied = 0;
    let userTotalBorrowed = 0;
    for (const pool of pools) {
      const supplyRaw: BigNumber = data.get(this.supplied(address, pool.id)).output.data;
      const borrowRaw: BigNumber = data.get(this.borrowed(address, pool.id)).output.data;

      if (supplyRaw.isZero() && borrowRaw.isZero()) continue;
      const decimals = 18 - 8 + pool.supply.token.decimals;

      const exchangeRate = normalizeDecimals(pool.meta.exchangeRate, decimals);

      if (!supplyRaw.isZero()) {
        const balance = normalizeDecimals(supplyRaw, pool.token.decimals) * exchangeRate;
        const supplyValue = balance * pool.supply.token.price;

        userSupplied.push({
          ...pool.supply,
          amount: balance,
          value: supplyValue,
        });
        userTotalSupplied += supplyValue * pool.meta.ltv;
      } else if (!borrowRaw.isZero()) {
        const balance = normalizeDecimals(borrowRaw, pool.borrow.token.decimals);
        const borrowValue = balance * pool.borrow.token.price;
        userTotalBorrowed += borrowValue;
        userBorrowed.push({
          ...pool.borrow,
          amount: balance,
          value: borrowValue,
        });
      }
    }

    return [
      {
        id: this.meta.id,
        chain: this.meta.chain,
        feature: this.meta.feature,
        borrowed: userBorrowed,
        supplied: userSupplied,
        debtRatio: userTotalBorrowed === 0 ? 0 : userTotalSupplied / userTotalBorrowed,
      },
    ];
  }

  protected async fetchUsersData(pools: ILendingFeatureOpportunity[], address: string) {
    const calls = new Map();
    for (const { id: cToken } of pools) {
      const contract = new DynamicContract(cToken);
      const suppliedCall = contract.createCall(this.cFunctions.supplied, address);
      const borrowedCall = contract.createCall(this.cFunctions.borrowed, address);

      calls.set(this.supplied(address, cToken), suppliedCall);
      calls.set(this.borrowed(address, cToken), borrowedCall);
    }

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }

  protected supplied(account: Address, cToken: Address): string {
    return `${account}.supplied.${cToken}`;
  }

  protected borrowed(account: Address, cToken: Address): string {
    return `${account}.borrowed.${cToken}`;
  }

  protected cash(cToken: Address): string {
    return `${cToken}.cash`;
  }

  protected underlying(cToken: Address): string {
    return `${cToken}.underlying`;
  }

  protected isCollateral(account: Address, cToken: Address): string {
    return `${account}.isMember.${cToken}`;
  }

  protected markets(cToken: Address): string {
    return `${cToken}.markets`;
  }

  protected totalSupply(cToken: Address): string {
    return `${cToken}.totalSupply`;
  }

  protected totalBorrows(cToken: Address): string {
    return `${cToken}.totalBorrows`;
  }

  protected exchangeRate(cToken: Address): string {
    return `${cToken}.exchangeRate`;
  }

  protected get exchangeRateDecimals(): number {
    return 28;
  }

  private toLendingFeatureEntryMinimal(
    cToken: string,
    data: Map<string, CallData<any>>,
  ): ILendingFeatureEntryMinimal {
    const markets = data.get(this.markets(cToken)).output.data[1];

    const cash: string = data.get(this.cash(cToken)).output.data;
    const underlying = data.has(this.underlying(cToken))
      ? data.get(this.underlying(cToken)).output.data
      : ZERO_ADDRESS;

    const totalBorrowed: BigNumber = data.get(this.totalBorrows(cToken)).output.data;
    const totalSupplied: BigNumber = data.get(this.totalSupply(cToken)).output.data;
    const exchangeRate: BigNumber = data.get(this.exchangeRate(cToken)).output.data;

    return {
      id: cToken,
      chain: this.meta.chain,
      feature: this.meta.feature,
      token: {
        address: cToken,
        totalSupplied: cash.toString(),
      },
      borrow: {
        token: {
          address: underlying,
        },
        totalBorrowed: totalBorrowed.toString(),
      },
      supply: {
        token: {
          address: underlying,
        },
        totalSupplied: totalSupplied.toString(),
      },
      meta: {
        ltv: normalizeDecimals(markets, 18),
        exchangeRate: exchangeRate.toString(),
      },
    };
  }
}
