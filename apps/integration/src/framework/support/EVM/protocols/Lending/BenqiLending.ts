import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { toDecimals } from '../../../../../common/utils/util';

import { FeatureEnum } from '../../../enums';
import {
  INamedFunctionPredicates,
  INamedFunctions,
  IProtocolMeta,
  IRootProtocol,
} from '../../../interfaces';
import {
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
} from '../../../interfaces/feature.lending.interface';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
} from '../../../interfaces/tokens.borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { IRewardTokenUserEntry } from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

interface IBenqiLendContext {
  allMarkets?: string[];
  rewards?: string[];
  initialIndexConstant?: number;
}

const BENQI_INDEX_DECIMALS = 54;
export interface IBenqiMeta extends IProtocolMeta {
  feature: FeatureEnum.lending;
  address: Address;
  market: Address;
  avax: Address;
  qi: Address;
  context: IBenqiLendContext;
  name: string;
}

export class BenqiLending
  extends SingleContractProtocol<
    ILendingFeatureEntryMinimal,
    ILendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    IBenqiMeta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: FakeAssetService,
  ) {
    super();
  }

  marketFunctions: INamedFunctions = {};

  protected functionPredicates: INamedFunctionPredicates = {
    rewardAccrued: () => (item) => item.name === 'rewardAccrued',
    allMarkets: () => (item) => item.name === 'getAllMarkets',
    rewardBorrowState: () => (item) => item.name === 'rewardBorrowState',
    rewardSupplyState: () => (item) => item.name === 'rewardSupplyState',
    rewardBorrowerIndex: () => (item) => item.name === 'rewardBorrowerIndex',
    rewardSupplierIndex: () => (item) => item.name === 'rewardSupplierIndex',
    initialIndexConstant: () => (item) => item.name === 'initialIndexConstant',
    markets: () => (item) => item.name === 'markets',
    checkMembership: () => (item) => item.name === 'checkMembership',
    supplyRewardSpeeds: () => (item) => item.name === 'supplyRewardSpeeds',
    borrowRewardSpeeds: () => (item) => item.name === 'borrowRewardSpeeds',
  };

  protected qiMarketFunctionPredicates: INamedFunctionPredicates = {
    exchangeRateStored: () => (item) => item.name === 'exchangeRateStored',
    accountSnapshot: () => (item) => item.name === 'getAccountSnapshot',
    balance: () => (item) => item.name === 'balanceOf',
    totalSupply: () => (item) => item.name === 'totalSupply',
    totalBorrows: () => (item) => item.name === 'totalBorrows',
    supplyRatePerTimestamp: () => (item) => item.name === 'supplyRatePerTimestamp',
    borrowRatePerTimestamp: () => (item) => item.name === 'borrowRatePerTimestamp',
    underlying: () => (item) => item.name === 'underlying',
    borrowIndex: () => (item) => item.name === 'borrowIndex',
  };

  protected async fetchOpportunityData(
    context: IBenqiLendContext,
  ): Promise<ILendingFeatureEntryMinimal[]> {
    const marketDataResp = await this.multicall.handleInBatches(
      context.allMarkets.reduce((resp, market) => {
        const marketContract = new DynamicContract(market);
        resp.set(
          `${market}.totalSupply`,
          marketContract.createCall(this.marketFunctions.totalSupply),
        );
        resp.set(
          `${market}.totalBorrows`,
          marketContract.createCall(this.marketFunctions.totalBorrows),
        );
        resp.set(
          `${market}.supplyRate`,
          marketContract.createCall(this.marketFunctions.supplyRatePerTimestamp),
        );
        resp.set(
          `${market}.borrowRate`,
          marketContract.createCall(this.marketFunctions.borrowRatePerTimestamp),
        );
        resp.set(
          `${market}.exchangeRate`,
          marketContract.createCall(this.marketFunctions.exchangeRateStored),
        );

        // There is no underlying method in the qiAvax contract
        if (market.toLowerCase() !== '0x5c0401e81bc07ca70fad469b451682c0d747ef1c') {
          resp.set(
            `${market}.underlying`,
            marketContract.createCall(this.marketFunctions.underlying),
          );
        }
        return resp;
      }, new Map()),
      this.meta.chain,
    );

    return context.allMarkets.map((market) => {
      return {
        feature: this.meta.feature,
        chain: this.meta.chain,
        id: market.toLowerCase(),
        supplied: [
          {
            token: {
              address: market.toLowerCase(),
            },
            totalSupplied: marketDataResp.get(`${market}.totalSupply`).output.data.toString(),
            rate: {
              supplyRate: marketDataResp.get(`${market}.supplyRate`).output.data.toString(),
              exchangeRate: marketDataResp.get(`${market}.exchangeRate`).output.data.toString(),
              borrowSupply: marketDataResp.get(`${market}.totalBorrows`).output.data.toString(),
            },
          },
        ],
        borrowed: [
          {
            token: {
              address: market.toLowerCase(),
            },
            totalBorrowed: marketDataResp.get(`${market}.totalBorrows`).output.data.toString(),
            rate: {
              borrowRate: marketDataResp.get(`${market}.borrowRate`).output.data?.toString(),
            },
          },
        ],
        rewarded: [this.meta.avax, this.meta.qi].map((rewardAddr) => ({
          token: { address: rewardAddr.toLowerCase() },
        })),
      };
    });
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplyDec = normalizeDecimals(supplied.totalSupplied, token?.decimals);
    const decimals = 18 + token.underlying[0]?.decimals - token.decimals;
    const exchangeRateDec = normalizeDecimals(supplied.rate.exchangeRate, decimals);
    const totalSupply = totalSupplyDec * exchangeRateDec;
    const tvl =
      (totalSupply - toDecimals(supplied.rate.borrowSupply, token.underlying[0]?.decimals)) *
      token.underlying[0]?.price;
    const apy = this.formatApy?.(supplied, 'supplyApy');
    return {
      totalSupply,
      token,
      apy,
      tvl,
    };
  }

  protected formatOpportunityBorrowedToken(
    borrowed: IBorrowTokenMinimal,
    token: ERC20Token,
  ): IBorrowTokenOpportunity {
    const totalBorrowed = normalizeDecimals(borrowed.totalBorrowed, token.underlying[0].decimals);
    const tvl = totalBorrowed * token.underlying[0].price;
    const apy = this.formatApy?.(borrowed, 'borrowApy');
    return {
      totalBorrowed,
      token,
      apy,
      tvl,
    };
  }

  async initialize() {
    this.logger.log(
      `Initializing: ${this.meta.name} ${this.meta.chain}/${this.meta.address}`,
      `SingleContractProtocol/${this.constructor.name}`,
    );

    this.functions = await this.abiService.parseFunctionsFromAddress(
      this.meta.address,
      this.meta.chain, // TODO: update to this.meta.chain once they are verified
      this.functionPredicates,
    );

    this.marketFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.market,
      this.meta.chain,
      this.qiMarketFunctionPredicates,
    );

    this.logger.log(
      `${this.meta.chain}/${this.meta.address} found ${Object.keys(this.functions).length}/${
        Object.keys(this.functionPredicates).length
      } functions`,
      `SingleContractProtocol/${this.constructor.name}`,
    );
  }

  private setMarketRewardCalls(
    address: Address,
    market: string,
    rewardIndex: number,
    mainContract: DynamicContract,
    callsMap: Map<string, CallData>,
  ) {
    callsMap.set(
      this.getSupplyRewardSpeeds(market, rewardIndex),
      mainContract.createCall(this.functions.supplyRewardSpeeds, rewardIndex, market),
    );

    callsMap.set(
      this.getBorrowRewardSpeeds(market, rewardIndex),
      mainContract.createCall(this.functions.borrowRewardSpeeds, rewardIndex, market),
    );

    callsMap.set(
      this.getSupplierIndexLabel(market, address, rewardIndex),
      mainContract.createCall(this.functions.rewardSupplierIndex, rewardIndex, market, address),
    );

    callsMap.set(
      this.getBorrowerIndexLabel(market, address, rewardIndex),
      mainContract.createCall(this.functions.rewardBorrowerIndex, rewardIndex, market, address),
    );

    callsMap.set(
      this.getAccruedRewardLabel(address, rewardIndex),
      mainContract.createCall(this.functions.rewardAccrued, rewardIndex, address),
    );

    callsMap.set(
      this.getBorrowStateIndexLabel(market, rewardIndex),
      mainContract.createCall(this.functions.rewardBorrowState, rewardIndex, market),
    );

    callsMap.set(
      this.getSupplyStateIndexLabel(market, rewardIndex),
      mainContract.createCall(this.functions.rewardSupplyState, rewardIndex, market),
    );
  }

  private getSupplierIndexLabel(market: string, address: string, index: number) {
    return concatStrings(market, address, index, this.functions.rewardSupplierIndex.name);
  }

  private getBorrowerIndexLabel(market: string, address: string, index: number) {
    return concatStrings(market, address, index, this.functions.rewardBorrowerIndex.name);
  }

  private getAccruedRewardLabel(address: string, index: number) {
    return concatStrings(address, index, this.functions.rewardAccrued.name);
  }

  private getBorrowStateIndexLabel(market: string, index: number) {
    return concatStrings(market, index, this.functions.rewardBorrowState.name);
  }

  private getSupplyStateIndexLabel(market: string, index: number) {
    return concatStrings(market, index, this.functions.rewardSupplyState.name);
  }

  private getAccountSnapshotLabel(address: string, market: string) {
    return concatStrings(address, market, this.marketFunctions.accountSnapshot.name);
  }

  private getMarketBorrowIndexLabel(market: string) {
    return concatStrings(market, this.marketFunctions.borrowIndex.name);
  }

  private getMarketsLabel(market: string) {
    return concatStrings(market, this.functions.markets.name);
  }

  private getMembershipLabel(address: string, market: string) {
    return concatStrings(address, market, this.functions.checkMembership.name);
  }

  private getSupplyRewardSpeeds(market: string, index: number) {
    return concatStrings(market, index, this.functions.supplyRewardSpeeds.name);
  }

  private getBorrowRewardSpeeds(market: string, index: number) {
    return concatStrings(market, index, this.functions.borrowRewardSpeeds.name);
  }

  private async getMulticallMarketsData(address: Address, pools: ILendingFeatureOpportunity[]) {
    const mainContract = this.getMainContract();
    return await this.multicall.handleInBatches(
      pools.reduce((resp, { id }) => {
        const marketContract = new DynamicContract(id);
        this.setMarketRewardCalls(address, id, 0, mainContract, resp);
        this.setMarketRewardCalls(address, id, 1, mainContract, resp);
        resp.set(
          this.getMarketBorrowIndexLabel(id),
          marketContract.createCall(this.marketFunctions.borrowIndex),
        );

        resp.set(
          this.getAccountSnapshotLabel(address, id),
          marketContract.createCall(this.marketFunctions.accountSnapshot, address),
        );

        resp.set(this.getMarketsLabel(id), mainContract.createCall(this.functions.markets, id));

        resp.set(
          this.getMembershipLabel(address, id),
          mainContract.createCall(this.functions.checkMembership, address, id),
        );
        return resp;
      }, new Map()),
      this.meta.chain,
    );
  }

  protected async fetchUserData(
    address: Address,
    pools: ILendingFeatureOpportunity[],
  ): Promise<ILendingFeatureUserEntry[]> {
    const supplyTokens = [];
    const borrowTokens = [];
    const multicallResp = await this.getMulticallMarketsData(address, pools);
    const rewardBalancesMap = [this.meta.avax, this.meta.qi].reduce((resp, address) => {
      resp.set(address, 0);
      return resp;
    }, new Map());
    let totalCollaterall = 0;
    let totalBorrowed = 0;
    pools.forEach((pool) => {
      const userMarketData: BigNumber[] = multicallResp.get(
        this.getAccountSnapshotLabel(address, pool.id),
      ).output.data;
      const borrowBalance = userMarketData[2].toNumber();
      const supplyBalance = userMarketData[1].toNumber();
      const exchangeRate = userMarketData[3].toString();
      let flag = false;
      const { borrow, supply } = this.useDistributionApy(pool, multicallResp);

      if (supplyBalance > 0) {
        flag = true;
        const collateralFactor = multicallResp.get(this.getMarketsLabel(pool.id)).output.data
          .collateralFactorMantissa;
        const userSupply = this.formatLendingUserData(
          pool.supplied[0],
          supplyBalance,
          Number(supply),
          exchangeRate,
        );
        if (multicallResp.get(this.getMembershipLabel(address, pool.id)).output.data) {
          totalCollaterall += userSupply.value * toDecimals(collateralFactor, 18);
        }
        supplyTokens.push(userSupply);
      }
      if (borrowBalance > 0) {
        flag = true;
        pool.borrowed[0].apy.borrowApy = -pool.borrowed[0].apy.borrowApy;
        const userBorrow = this.formatLendingUserData(
          pool.borrowed[0],
          borrowBalance,
          Number(borrow),
        );
        totalBorrowed += userBorrow.value;
        borrowTokens.push(userBorrow);
      }

      if (flag) {
        this.getUserMarketRewards(
          pool,
          borrowBalance,
          supplyBalance,
          multicallResp,
          address,
          rewardBalancesMap,
        );
      }
    });

    const formattedRewards = pools[0].rewarded
      .map((reward) => {
        const amount = rewardBalancesMap.get(reward.token.address);
        if (!amount) return;
        const value = amount * reward.token.price;
        reward['amount'] = amount;
        reward['value'] = value;
        return reward as IRewardTokenUserEntry;
      })
      .filter((reward) => reward);

    return [
      {
        feature: FeatureEnum.lending,
        id: 'benqi-lending',
        chain: this.meta.chain,
        borrowed: borrowTokens,
        supplied: supplyTokens,
        rewarded: formattedRewards || [],
        debtRatio:
          borrowTokens.length || supplyTokens.length
            ? Math.min(totalCollaterall / totalBorrowed, 1_000_000)
            : 0,
      },
    ];
  }

  private getUserMarketRewards(
    pool: ILendingFeatureOpportunity,
    borrowBalance: number,
    supplyBalance: number,
    multiCallResp: Map<string, CallData>,
    address: Address,
    rewardBalancesMap: Map<string, number>,
  ) {
    pool.rewarded.forEach((reward) => {
      const returnTokenIndex: number = ReturnTokenIndex[reward.token.symbol];
      const rewardAccrued = multiCallResp.get(this.getAccruedRewardLabel(address, returnTokenIndex))
        .output.data;
      const rewardAccruedDec = rewardAccrued.shiftedBy(-reward.token.decimals);

      const supplyStateIndex = multiCallResp.get(
        this.getSupplyStateIndexLabel(pool.id, returnTokenIndex),
      ).output.data.index;
      const supplyStateIndexDec = supplyStateIndex.shiftedBy(
        -BENQI_INDEX_DECIMALS + pool.supplied[0].token.decimals,
      );

      const borrowStateIndex = multiCallResp.get(
        this.getBorrowStateIndexLabel(pool.id, returnTokenIndex),
      ).output.data.index;

      const borrowStateIndexDec = borrowStateIndex.shiftedBy(
        -BENQI_INDEX_DECIMALS + pool.supplied[0].token.underlying[0].decimals,
      );

      const supplierIndex = multiCallResp.get(
        this.getSupplierIndexLabel(pool.id, address, returnTokenIndex),
      ).output.data;

      let supplierIndexDec = supplierIndex.shiftedBy(
        -BENQI_INDEX_DECIMALS + pool.supplied[0].token.decimals,
      );

      const borrowerIndex = multiCallResp.get(
        this.getBorrowerIndexLabel(pool.id, address, returnTokenIndex),
      ).output.data;

      const borrowerIndexDec = borrowerIndex.shiftedBy(
        -BENQI_INDEX_DECIMALS + pool.supplied[0].token.underlying[0].decimals,
      );

      const supplyBalanceDec = new BigNumber(supplyBalance).shiftedBy(
        -pool.supplied[0].token.decimals,
      );

      const borrowBalanceDec = new BigNumber(borrowBalance).shiftedBy(
        -pool.supplied[0].token.underlying[0].decimals,
      );

      if (supplierIndexDec.isZero()) {
        supplierIndexDec = new BigNumber(10)
          .pow(36)
          .shiftedBy(-BENQI_INDEX_DECIMALS + pool.supplied[0].token.decimals);
      }

      let supplierAccrued = new BigNumber(0);
      if (supplierIndexDec.gt(0)) {
        const supplyIndexDelta = supplyStateIndexDec.minus(supplierIndexDec);
        const userSupplyBalance = supplyBalanceDec.times(supplyIndexDelta);
        supplierAccrued = Number(userSupplyBalance) > 0 ? userSupplyBalance : rewardAccruedDec;
      }
      let borrowerAccrued = new BigNumber(0);
      if (borrowerIndexDec.gt(0)) {
        const borrowIndexDelta = borrowStateIndexDec.minus(borrowerIndexDec);
        borrowerAccrued = borrowBalanceDec.times(borrowIndexDelta);
      }

      const rewards = supplierAccrued.plus(borrowerAccrued);
      rewardBalancesMap.set(
        reward.token.address,
        rewardBalancesMap.get(reward.token.address) + rewards.toNumber(),
      );
    });
    return rewardBalancesMap;
  }

  protected formatApy(opportunity: ISupplyTokenMinimal, field: string) {
    const apy = new BigNumber(opportunity.rate.borrowRate || opportunity.rate.supplyRate)
      .div(10 ** 18)
      .times(86400)
      .plus(1)
      .pow(365)
      .minus(1)
      // .times(100)
      .toNumber();
    return {
      [field]: apy,
    };
  }

  formatLendingUserData(
    pool: IBorrowTokenOpportunity | ISupplyTokenOpportunity,
    balance: number,
    distributionApy: number,
    exchangeRate = '1000000000000000000',
  ) {
    const userBalance =
      toDecimals(balance, pool.token.underlying[0].decimals) * toDecimals(exchangeRate, 18);
    let apy = null;
    if (pool.apy) {
      const variants = ['supplyApy', 'borrowApy'];
      for (const variant of variants) {
        if (pool.apy[variant]) {
          apy = pool.apy[variant] + distributionApy / 100;
          break;
        }
      }
    }

    const breakdown = {
      day: apy / 365,
      week: apy / 52,
      month: apy / 12,
      year: apy,
    };

    return Object.assign({}, pool, {
      amount: userBalance,
      value: userBalance * pool.token.underlying[0].price,
      apr: breakdown,
      apy: breakdown,
    });
  }

  useDistributionApy = (pool: ILendingFeatureOpportunity, multicallResp: Map<string, CallData>) => {
    const poolRewards = pool.rewarded.map((reward) => reward.token);
    const rewards = poolRewards.map((rewardToken) => {
      const index = ReturnTokenIndex[rewardToken.symbol];

      const borrowRewardSpeedRaw = multicallResp.get(
        this.getBorrowRewardSpeeds(pool.id, Number(index)),
      ).output.data;

      const supplyRewardsSpeedRaw = multicallResp.get(
        this.getSupplyRewardSpeeds(pool.id, Number(index)),
      ).output.data;

      const supplyRewardsPerDay = supplyRewardsSpeedRaw
        .div(10 ** rewardToken.decimals)
        .times(60 * 60 * 24);

      const borrowRewardsPerDay = borrowRewardSpeedRaw
        .div(10 ** rewardToken.decimals)
        .times(60 * 60 * 24);

      const baseSupply = new BigNumber(rewardToken.price)
        .times(supplyRewardsPerDay)
        .div(
          new BigNumber(pool.supplied[0].totalSupply).times(
            pool.supplied[0].token.underlying[0].price,
          ),
        )
        .plus(1);
      const baseBorrow = new BigNumber(rewardToken.price)
        .times(borrowRewardsPerDay)
        .div(
          new BigNumber(pool.borrowed[0].totalBorrowed).times(
            pool.supplied[0].token.underlying[0].price,
          ),
        )
        .plus(1);

      let supply = baseSupply //
        .pow(365)
        .minus(1)
        .times(100);
      let borrow = baseBorrow //
        .pow(365)
        .minus(1)
        .times(100);

      if (supply.isNaN()) supply = new BigNumber(0);
      if (borrow.isNaN() || pool.supplied[0].token.underlying[0].symbol === 'sAVAX') {
        borrow = new BigNumber(0);
      }

      return {
        rewardToken,
        supply,
        borrow,
      };
    });

    const [supply, borrow] = rewards.reduce(
      (total, { supply, borrow }) => {
        return [total[0].plus(supply), total[1].plus(borrow)];
      },
      [new BigNumber(0), new BigNumber(0)],
    );

    return {
      supply: supply.gte(10000) ? new BigNumber(10000).toString() : supply.toFixed(2),
      borrow: borrow.gte(10000) ? new BigNumber(10000).toString() : borrow.toFixed(2),
    };
  };
}

export enum ReturnTokenIndex {
  AVAX = 1,
  QI = 0,
}
