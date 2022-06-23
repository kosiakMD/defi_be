import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
// import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

// import { toDecimals } from '../../../../../common/utils/util';
//
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta, IUserDataProtocolResponse } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from '../../../interfaces/tokens.borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { EVMCore } from '../../EVMCore';

export type ILendingFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal<{ apr: number }>,
  void,
  IBorrowTokenMinimal<{ apr: number }>
>;
export type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity
>;
export type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  void,
  IBorrowTokenUserEntity[],
  void
> & { debtRatio: number };

export interface ICompoundFinanceLendingMeta extends IProtocolMeta {
  feature: FeatureEnum.lending;
  name: string;
  address: Address;
  context: {
    endpoint: string;
  };
}

export class CompoundFinanceLending extends EVMCore<
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
  ICompoundFinanceLendingMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<ILendingFeatureEntryMinimal[]> {
    const $data = this.httpService.get(this.ctokenEndpoint).pipe(
      mergeMap(({ data }) => data.cToken),
      map((position) => this.toLendingFeatureEntryMinimal(position)),
      toArray(),
    );

    return firstValueFrom($data);
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<ILendingFeatureUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();
    const results = new Map<string, ILendingFeatureUserEntry[]>(
      addresses.map((address) => [address, [] as ILendingFeatureUserEntry[]]),
    );
    try {
      const lendingPositions = await this.fetchUsersData(addresses);
      for (const address of addresses) {
        const data = this.formatUserData(address, pools, lendingPositions);
        results.get(address).push(...data);
      }
    } catch (err) {
      errors.push(err);
    }

    return { data: results, errors };
  }

  protected formatUserData(
    address: string,
    pools: ILendingFeatureOpportunity[],
    lendingPositions: any[],
  ): ILendingFeatureUserEntry[] {
    const lendingAddressPosition = lendingPositions.find((x) => x.address === address);
    if (!lendingAddressPosition) return [];

    const supplyEntry: ISupplyTokenUserEntry[] = [];
    const borrowEntry: IBorrowTokenUserEntity[] = [];

    for (const position of lendingAddressPosition.tokens) {
      const pool = pools.find((x) => x.id === position.address);
      if (!pool) continue;

      if (position['supply_balance_underlying'].value > 0) {
        const amount = Number(position['supply_balance_underlying'].value);
        supplyEntry.push({
          ...pool.supply,
          amount: amount,
          value: amount * pool.supply.token.price,
        });
      } else if (position['borrow_balance_underlying'].value > 0) {
        const amount = Number(position['borrow_balance_underlying'].value);
        borrowEntry.push({
          ...pool.borrow,
          amount: amount,
          value: amount * pool.supply.token.price,
        });
      }
    }

    return [
      {
        id: 'compound-finance-lending',
        chain: this.meta.chain,
        feature: this.meta.feature,
        borrowed: borrowEntry,
        supplied: supplyEntry,
        debtRatio: Number(lendingAddressPosition.health.value),
      },
    ];
  }

  protected async fetchUsersData(addresses: string[]): Promise<any[]> {
    const $data = this.httpService
      .get(this.accountEndpoint, {
        params: {
          addresses,
        },
      })
      .pipe(
        mergeMap(({ data }) => data.accounts),
        toArray(),
      );
    return firstValueFrom($data);
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal<{ apr: number }>,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = Number(supplied.totalSupplied);
    return {
      token,
      apy: { year: supplied.extra.apr },
      tvl: totalSupplied * token.price,
    };
  }

  protected formatOpportunityBorrowedToken(
    borrowed: IBorrowTokenMinimal<{ apr: number }>,
    token: ERC20Token,
  ): IBorrowTokenOpportunity {
    const totalBorrowed = Number(borrowed.totalBorrowed);
    const tvl = totalBorrowed * token.price;
    return {
      token,
      apy: { year: borrowed.extra.apr },
      tvl,
    };
  }

  private get ctokenEndpoint(): string {
    return new URL('ctoken', this.meta.context.endpoint).toString();
  }

  private get accountEndpoint(): string {
    return new URL('account', this.meta.context.endpoint).toString();
  }

  private toLendingFeatureEntryMinimal(position: any): ILendingFeatureEntryMinimal {
    return {
      id: position['token_address'],
      chain: this.meta.chain,
      feature: this.meta.feature,
      token: {
        address: position['token_address'],
      },
      borrow: {
        token: {
          address: position['underlying_address'],
        },
        totalBorrowed: position['total_borrows'].value,
        extra: {
          apr: Number(position['borrow_rate'].value),
        },
      },
      supply: {
        token: {
          address: position['underlying_address'],
        },
        totalSupplied: position['total_supply'].value,
        extra: {
          apr: Number(position['supply_rate'].value),
        },
      },
    };
  }
}
