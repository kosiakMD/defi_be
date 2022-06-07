import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
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

export interface ILiquityTroveMeta extends IProtocolMeta {
  address: Address;
  context: {
    depositToken: Address;
    borrowToken: Address;
  };
}

export type ILiquityStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  void,
  IBorrowTokenMinimal
>;

export type ILiquityStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity
>;

export type ILiquityStakingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  void,
  IBorrowTokenUserEntity
> & { debtRatio: number };
export class LiquityTrove extends SingleContractProtocol<
  ILiquityStakingFeatureMinimal,
  ILiquityStakingFeatureOpportunity,
  ILiquityStakingFeatureUserEntry,
  ILiquityTroveMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
  ) {
    super();
  }

  protected functionPredicates: INamedFunctionPredicates = {
    trove: () => (item) => item.name === 'Troves',
    totalSupplied: () => (item) => item.name === 'getEntireSystemColl',
    totalBorrowed: () => (item) => item.name === 'getEntireSystemDebt',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<ILiquityStakingFeatureMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: { address: context.depositToken.toLowerCase() },
          totalSupplied: context.totalSupplied.toString(),
        },
        borrow: {
          token: { address: context.borrowToken.toLowerCase() },
          totalBorrowed: context.totalBorrowed.toString(),
        },
      },
    ];
  }

  protected async fetchUserData(
    address: string,
    pools: ILiquityStakingFeatureOpportunity[],
  ): Promise<ILiquityStakingFeatureUserEntry[]> {
    const contract = new DynamicContract(this.meta.address);
    const pool = pools.shift();
    const trove = await this.multicall.call(
      contract.createCall(this.functions.trove, address),
      this.meta.chain,
    );

    const supplyBalance = normalizeDecimals(trove.coll, pool.supply.token.decimals);
    const borrowBalance = normalizeDecimals(trove.debt, pool.supply.token.decimals);

    if (!supplyBalance) return [];

    const supplyValue = supplyBalance * pool.supply.token.price;
    const borrowValue = borrowBalance * pool.borrow.token.price;
    const totalCollateralRatio = pool.supply.totalSupplied / pool.borrow.totalBorrowed;
    // 110% under normal operation, 150% in recovery mode
    const minimumCollateralRatio = totalCollateralRatio < 1.5 ? 1.5 : 1.1;
    const debtRatio = (supplyValue * (1 / minimumCollateralRatio)) / borrowValue;

    return [
      {
        ...pool,
        debtRatio,
        supply: {
          ...pool.supply,
          amount: supplyBalance,
          value: supplyValue,
        },
        borrow: {
          ...pool.borrow,
          amount: borrowBalance,
          value: borrowValue,
        },
      },
    ];
  }
}
