import { Cache } from 'cache-manager';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { MissingTokenException } from '../../../exceptions';
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
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

export type ILendingFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  void,
  IBorrowTokenMinimal,
  { safetyRatio: number; supplyPrice: string }
>;
export type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity<any>,
  { safetyRatio: number }
>;
export type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  void,
  IBorrowTokenUserEntity[]
> & { debtRatio: number };

export interface YetiFinanceMeta extends IProtocolMeta {
  name: string;
  address: string;
  feature: FeatureEnum.lending;
  context: {
    // sourceAPR: string;
    borrowedToken: string;
    troveManager: string;
  };
}

export class YetiFinanceLending
  extends SingleContractProtocol<
    ILendingFeatureEntryMinimal,
    ILendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    YetiFinanceMeta
  >
  implements IRootProtocol
{
  protected functionPredicates: INamedFunctionPredicates = {
    getValidCollateral: () => (item) => item.name === 'getValidCollateral',
    params: () => (item) => item.name === 'collateralParams',
    price: () => (item) => item.name === 'getPrice',
  };
  protected lendingFunctions: INamedFunctionPredicates = {
    getUserAccountData: () => (item) => item.name === 'getEntireDebtAndColls',
    total: () => (item) => item.name === 'getTotalStake',
    debt: () => (item) => item.name === 'getEntireSystemDebt',
  };

  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }

  protected async fetchOpportunityData(
    context: Record<string, any>,
  ): Promise<ILendingFeatureEntryMinimal[]> {
    const contract = this.getMainContract();
    const troveManager = new DynamicContract(this.meta.context.troveManager);
    const lendingFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.context.troveManager,
      this.meta.chain,
      this.lendingFunctions,
    );

    const collaterals: string[] = context.getValidCollateral;
    const calls = new Map();
    collaterals.map((token) => {
      calls.set(`${token}.params`, contract.createCall(this.functions.params, token));
      calls.set(`${token}.price`, contract.createCall(this.functions.price, token));
      calls.set(`${token}.total`, troveManager.createCall(lendingFunctions.total, token));
    });
    calls.set(
      `${this.meta.context.borrowedToken}.debt`,
      troveManager.createCall(lendingFunctions.debt),
    );

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    const list: ILendingFeatureEntryMinimal[] = collaterals.map((token: string) => {
      const params = results.get(`${token}.params`).output.data;
      const priceRaw = results.get(`${token}.price`).output.data;
      const total = results.get(`${token}.total`).output.data;
      const totalBorrowed = results.get(`${this.meta.context.borrowedToken}.debt`).output.data;

      const safetyRatio = normalizeDecimals(params[0], params[3].toString());
      return {
        feature: this.meta.feature,
        chain: this.meta.chain,
        id: token.toLowerCase(),
        meta: {
          safetyRatio: +safetyRatio.toString(),
          supplyPrice: priceRaw.toString(),
        },
        supply: {
          token: { address: token.toLowerCase() },
          totalSupplied: total.toString(),
          rate: {
            supplyRate: '0',
          },
        },
        borrow: {
          token: { address: this.meta.context.borrowedToken },
          totalBorrowed: totalBorrowed.toString(),
          rate: {},
        },
      };
    });

    return list;
  }

  protected formatOpportunity(
    opportunity: ILendingFeatureEntryMinimal,
    tokens: TokenMap,
  ): ILendingFeatureOpportunity {
    const supplyToken = tokens.get(opportunity.supply.token.address);
    const borrowToken = tokens.get(opportunity.borrow.token.address);
    if (!supplyToken || !borrowToken) {
      throw new MissingTokenException(opportunity.token, opportunity, this.meta.chain);
    }
    supplyToken.price = normalizeDecimals(opportunity.meta.supplyPrice, supplyToken.decimals);

    return {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      supply: this.formatOpportunitySuppliedToken(opportunity.supply, supplyToken),
      borrow: this.formatOpportunityBorrowedToken(opportunity.borrow, borrowToken),
      meta: opportunity.meta,
    };
  }

  protected async fetchUserData(
    address: string,
    pools: ILendingFeatureOpportunity[],
  ): Promise<ILendingFeatureUserEntry[]> {
    const troveManager = new DynamicContract(this.meta.context.troveManager);
    const lendingFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.context.troveManager,
      this.meta.chain,
      this.lendingFunctions,
    );

    const calls = new Map();
    calls.set(
      `${address}.getUserAccountData`,
      troveManager.createCall(lendingFunctions.getUserAccountData, address),
    );

    const multicallResults = await this.multicall.handleInBatches(calls, this.meta.chain);

    const userData = multicallResults.get(this.userAccountData(address)).output.data;
    const supplyMap: Map<string, string> = new Map(
      userData[1].map((token: string, index: number) => [
        token.toLowerCase(),
        userData[2][index].toString(),
      ]),
    );

    const borrowedEntity: IBorrowTokenUserEntity[] = [];
    const suppliedEntry: ISupplyTokenUserEntry[] = [];

    if (!userData[0].isZero()) {
      const amount = normalizeDecimals(userData[0], pools[0].borrow.token.decimals);
      const value = amount * pools[0].borrow.token.price;
      borrowedEntity.push({ ...pools[0].borrow, amount, value });
    }

    let ltv = 0;

    for (const { supply, meta } of pools) {
      const supplied: ISupplyTokenUserEntry = { amount: 0, value: 0, ...supply };
      const amountRow = supplyMap.get(supplied.token.address);
      if (supplyMap.has(supplied.token.address) && +amountRow > 0) {
        supplied.amount = normalizeDecimals(amountRow, supplied.token.decimals);
        supplied.value = supplied.amount * supply.token.price;
        ltv += supplied.value * meta.safetyRatio;

        suppliedEntry.push(supplied);
      }
    }

    return [
      {
        feature: FeatureEnum.lending,
        id: 'yeti-finance-lending',
        chain: this.meta.chain,
        borrowed: borrowedEntity,
        supplied: suppliedEntry,
        debtRatio: borrowedEntity.length > 0 && ltv ? ltv / borrowedEntity[0].value : 0,
      },
    ];
  }

  private userAccountData(address: string) {
    return `${address}.getUserAccountData`;
  }
}
