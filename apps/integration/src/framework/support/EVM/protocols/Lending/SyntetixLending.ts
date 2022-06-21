// eslint-disable-next-line max-classes-per-file
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { dataFrom, normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetService } from '../../../../../modules/microservices/asset.service';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
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

export interface ISyntetixLandingMeta extends IProtocolMeta {
  address: Address;
  stable: Address;
}

type ILendingFeatureEntryMinimal = BaseWithTokens<ISupplyTokenMinimal, void, IBorrowTokenMinimal>;

type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity
>;

type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  void,
  IBorrowTokenUserEntity
> & {
  collateralizationRatio: number;
  debtRatio: number;
};

export class SyntetixLending
  extends SingleContractProtocol<
    ILendingFeatureEntryMinimal,
    ILendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    ISyntetixLandingMeta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected httpService: HttpService,
    protected assetService: AssetService,
  ) {
    super();
  }

  protected susdBytes;
  protected functionPredicates: INamedFunctionPredicates = {
    //synthCount: () => (item) => item.name === 'availableSynthCount',
    //synthAvailable: () => (item) => item.name === 'availableSynths',
    // total SNX balance (including collateral/transferable)
    collateral: () => (item) => item.name === 'proxy',
    // balance of SNX token
    collateralBalance: () => (item) => item.name === 'collateral',
    // must be extracted from collateral balance, because included to other feature
    collateralTransferable: () => (item) => item.name === 'transferableSynthetix',
    // debt of synth token (account address, currency key (bytes32))
    collateralizationRatio: () => (item) => item.name === 'collateralisationRatio',
    debtBalance: () => (item) => item.name === 'debtBalanceOf',
    debtTotal: () => (item) => item.name === 'totalIssuedSynthsExcludeOtherCollateral',
  };

  async initialize(): Promise<void> {
    await super.initialize();
    this.susdBytes = this.multicall.web3(this.meta.chain).utils.asciiToHex('sUSD');
  }

  protected async fetchOpportunityData(context: {
    [p: string]: any;
  }): Promise<ILendingFeatureEntryMinimal[]> {
    const contract = this.getMainContract();
    const callsResult = await this.multicall.call(
      contract.createCall(this.functions.debtTotal, this.susdBytes),
      this.meta.chain,
    );
    return Promise.resolve([
      {
        feature: this.meta.feature,
        chain: this.meta.chain,
        id: 'mintr' + this.meta.address.toLowerCase(),
        supply: {
          token: { address: context.collateral.toLowerCase() },
        },
        borrow: {
          token: {
            address: this.meta.stable.toLowerCase(),
          },
          totalBorrowed: callsResult.toString(),
        },
      },
    ]);
  }

  protected async fetchUserData(
    address: Address,
    pools: ILendingFeatureOpportunity[],
  ): Promise<ILendingFeatureUserEntry[] | any> {
    const contract = this.getMainContract();
    const calls = new Map();
    calls.set(
      Labels.collateralBalance(address),
      contract.createCall(this.functions.collateralBalance, address),
    );
    calls.set(
      Labels.collateralTransferable(address),
      contract.createCall(this.functions.collateralTransferable, address),
    );
    calls.set(
      Labels.collateralizationRatio(address),
      contract.createCall(this.functions.collateralizationRatio, address),
    );
    calls.set(
      Labels.debtBalance(address),
      contract.createCall(this.functions.debtBalance, address, this.susdBytes),
    );
    const callsResult = await this.multicall.handleInBatches(calls, this.meta.chain);
    const pool = cloneDeep(pools[0]);

    const supplyData = dataFrom(callsResult, Labels.collateralBalance(address));
    const totalCollateralBalance = normalizeDecimals(supplyData, pool.supply.token.decimals);

    const transferableData = dataFrom(callsResult, Labels.collateralTransferable(address));
    const transferableBalance = normalizeDecimals(transferableData, pool.supply.token.decimals);

    const supplyBalance = totalCollateralBalance - transferableBalance;

    const supply = Object.assign(pool.supply, {
      value: supplyBalance * pool.supply.token.price,
      amount: supplyBalance,
    });

    const borrowData = dataFrom(callsResult, Labels.debtBalance(address));
    const borrowBalance = normalizeDecimals(borrowData, pool.borrow.token.decimals);
    const borrow = Object.assign(pool.borrow, {
      value: borrowBalance * pool.borrow.token.price,
      amount: borrowBalance,
    });
    const debtRatioData = dataFrom(callsResult, Labels.collateralizationRatio(address));
    const healthFactor = 1 / normalizeDecimals(debtRatioData, 18);
    const collateralizationRatio = healthFactor * 100;

    return supplyBalance > 0
      ? Promise.resolve([
          {
            feature: pool.feature,
            id: pool.id,
            chain: this.meta.chain,
            supply,
            borrow,
            collateralizationRatio,
            debtRatio: healthFactor,
          },
        ])
      : [];
  }
}

export class Labels {
  static collateralBalance(address: Address) {
    return `collateralBalance_(${address})`;
  }

  static collateralTransferable(address: Address) {
    return `collateralTransferable_(${address})`;
  }

  static collateralizationRatio(address: Address) {
    return `collateralizationRatio_(${address})`;
  }

  static debtBalance(address: Address) {
    return `debtBalance_(${address})`;
  }
}
