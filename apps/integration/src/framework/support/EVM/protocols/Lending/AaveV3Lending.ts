import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
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
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity as IBaseBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from '../../../interfaces/tokens.borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

interface IAaveV3LendContext {
  allReservedTokens?: { tokenAddress: string; symbol: string }[];
  allATokens?: { tokenAddress: string; symbol: string }[];
  reserveTokensAddresses?: any;
}

const AAVE_RATE_DECIMALS = 27;
export interface IAaveV3Meta extends IProtocolMeta {
  feature: FeatureEnum.lending;
  address: Address;
  pool: Address;
  incentivesV3: Address;
  context: IAaveV3LendContext;
  name: string;
}

type IBorrowTokenOpportunity = IBaseBorrowTokenOpportunity<{
  apy: { stable: number; variable: number };
}>;

type ILendingFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal[],
  IBorrowTokenMinimal
>;
type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity[],
  IBorrowTokenOpportunity
>;
type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  IRewardTokenUserEntry[],
  IBorrowTokenUserEntity[]
> & { debtRatio: number };

export class AaveV3Lending
  extends SingleContractProtocol<
    ILendingFeatureEntryMinimal,
    ILendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    IAaveV3Meta
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

  incentivesFunctions: INamedFunctions = {};

  protected functionPredicates: INamedFunctionPredicates = {
    allATokens: () => (item) => item.name === 'getAllATokens',
    allReservedTokens: () => (item) => item.name === 'getAllReservesTokens',
    reserveData: () => (item) => item.name === 'getReserveData',
    userReserveData: () => (item) => item.name === 'getUserReserveData',
    reserveTokensAddresses: () => (item) => item.name === 'getReserveTokensAddresses',
  };

  protected incentivesFunctionsPredicates: INamedFunctionPredicates = {
    allUserRewards: () => (item) => item.name === 'getAllUserRewards',
    rewardsList: () => (item) => item.name === 'getRewardsList',
  };

  protected async fetchOpportunityData(
    context: IAaveV3LendContext,
  ): Promise<ILendingFeatureEntryMinimal[]> {
    const contract = this.getMainContract();

    const reservesDataResp = await this.multicall.callArray(
      context.allReservedTokens.map((data) => {
        return contract.createCall(this.functions.reserveData, data.tokenAddress);
      }),
      this.meta.chain,
    );

    const incentivesContract = new DynamicContract(this.meta.incentivesV3);
    const rewards = await this.multicall.call(
      incentivesContract.createCall(this.incentivesFunctions.rewardsList),
      this.meta.chain,
    );

    return reservesDataResp.map(
      (
        {
          totalAToken,
          totalVariableDebt,
          liquidityRate,
          variableBorrowRate,
          stableBorrowRate,
          totalStableDebt,
        },
        index,
      ) => {
        const reservedPool = context.allReservedTokens[index];
        const aToken = context.allATokens[index];

        const borrowRate = {};
        this.updateBorrowRateField(
          'variableRate',
          variableBorrowRate,
          totalVariableDebt,
          borrowRate,
        );

        this.updateBorrowRateField('stableRate', stableBorrowRate, totalStableDebt, borrowRate);

        return {
          feature: this.meta.feature,
          chain: this.meta.chain,
          id: aToken.tokenAddress.toLowerCase(),
          supply: {
            token: { address: reservedPool.tokenAddress.toLowerCase() },
            totalSupplied: totalAToken.toString(),
            rate: { supplyRate: liquidityRate.toString() },
          },

          borrow: {
            token: { address: reservedPool.tokenAddress.toLowerCase() },
            totalBorrowed: (totalVariableDebt as BigNumber).plus(totalStableDebt).toString(),
            rate: borrowRate,
          },
          rewarded: rewards.map((rewardAddr) => ({ token: { address: rewardAddr.toLowerCase() } })),
        };
      },
    );
  }

  async initialize() {
    this.functions = await this.abiService.parseFunctionsFromAddress(
      this.meta.address,
      ChainIdEnum.plg, // TODO: update to this.meta.chain once they are verified
      this.functionPredicates,
    );

    this.incentivesFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.incentivesV3,
      ChainIdEnum.plg,
      this.incentivesFunctionsPredicates,
    );
  }

  protected updateBorrowRateField(
    field: string,
    rate: BigNumber,
    debtValue: BigNumber,
    borrowRate: any,
  ) {
    if (Number(debtValue) > 0) {
      borrowRate[field] = rate.toString();
    }
  }

  protected async fetchUserData(
    address: Address,
    pools: ILendingFeatureOpportunity[],
  ): Promise<ILendingFeatureUserEntry[]> {
    const contract = this.getMainContract();
    const poolContract = new DynamicContract(this.meta.pool);
    const incentivesV3 = new DynamicContract(this.meta.incentivesV3);
    const poolFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.pool,
      ChainIdEnum.avax, // TODO: update to this.meta.chain once they are verified
      {
        getUserAccountData: () => (item) => item.name === 'getUserAccountData',
      },
    );

    if (!this.meta.context.allATokens) {
      await this.callInputlessFunctions();
    }

    const calls = new Map();
    calls.set(
      `${address}.rewards`,
      incentivesV3.createCall(
        this.incentivesFunctions.allUserRewards,
        this.meta.context.allATokens.map((data) => data.tokenAddress),
        address,
      ),
    );
    calls.set(
      `${address}.getUserAccountData`,
      poolContract.createCall(poolFunctions.getUserAccountData, address),
    );
    pools.forEach((pool) => {
      calls.set(
        `${pool.id}.userReserveData(${address})`,
        contract.createCall(this.functions.userReserveData, pool.supply.token.address, address),
      );
    });

    const multicallResults = await this.multicall.handleInBatches(calls, this.meta.chain);

    const supplyTokens = [];
    const borrowTokens = [];
    let rewardTokens;
    pools.forEach((pool) => {
      if (!rewardTokens) rewardTokens = pool.rewarded.map((reward) => reward.token);
      const { currentATokenBalance, currentStableDebt, currentVariableDebt } = multicallResults.get(
        `${pool.id}.userReserveData(${address})`,
      ).output.data;

      if (Number(currentATokenBalance) > 0) {
        supplyTokens.push(
          this.formatLendingUserData(pool.supply, currentATokenBalance, pool.supply.apy.year),
        );
      }
      if (Number(currentVariableDebt) > 0) {
        borrowTokens.push(
          this.formatLendingUserData(
            pool.borrow,
            currentVariableDebt,
            pool.borrow.extra.apy.variable,
          ),
        );
      }
      if (Number(currentStableDebt) > 0) {
        borrowTokens.push(
          this.formatLendingUserData(pool.borrow, currentStableDebt, pool.borrow.extra.apy.stable),
        );
      }
    });

    const { rewardsList, unclaimedAmounts } = multicallResults //
      .get(`${address}.rewards`).output.data;

    const formattedRewards = rewardsList
      .map((tokenAddr, index) => {
        const rewardToken = rewardTokens.find((rt) => rt.address === tokenAddr.toLowerCase());
        const balance = unclaimedAmounts[index];
        const amount = toDecimals(balance, rewardToken.decimals);
        if (!amount) return;
        const value = amount * rewardToken.price;
        return {
          token: rewardToken,
          amount,
          value,
        };
      })
      .filter((reward) => reward);

    const { healthFactor } = multicallResults.get(`${address}.getUserAccountData`).output.data;

    return [
      {
        feature: FeatureEnum.lending,
        id: 'aave-lending',
        chain: this.meta.chain,
        borrowed: borrowTokens,
        supplied: supplyTokens,
        rewarded: formattedRewards || [],
        debtRatio:
          borrowTokens.length || supplyTokens.length
            ? Math.min(toDecimals(healthFactor, 18), 1_000_000)
            : 0,
      },
    ];
  }

  protected formatOpportunityBorrowedToken(
    borrowed: IBorrowTokenMinimal,
    token: ERC20Token,
  ): IBorrowTokenOpportunity {
    const totalBorrowed = normalizeDecimals(borrowed.totalBorrowed, token.decimals);
    const tvl = totalBorrowed * token.price;
    return {
      token,
      apy: { year: null },
      tvl,
      extra: {
        apy: {
          stable: normalizeDecimals(borrowed.rate.stableRate, AAVE_RATE_DECIMALS),
          variable: normalizeDecimals(borrowed.rate.variableRate, AAVE_RATE_DECIMALS),
        },
      },
    };
  }

  protected formatSupplyApy(supplied: ISupplyTokenMinimal) {
    return {
      year: normalizeDecimals(supplied.rate.supplyRate, AAVE_RATE_DECIMALS),
    };
  }

  formatLendingUserData(
    pool: IBorrowTokenOpportunity | ISupplyTokenOpportunity,
    balance: string,
    apy: number,
  ) {
    const userBalance = toDecimals(balance, pool.token.decimals);

    const breakdown = {
      day: apy / 365,
      week: apy / 52,
      month: apy / 12,
      year: apy,
    };

    return Object.assign({}, pool, {
      amount: userBalance,
      value: userBalance * pool.token.price,
      apr: breakdown,
      apy: breakdown,
    });
  }
}
