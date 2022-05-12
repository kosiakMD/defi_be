import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { toDecimals } from '../../../../../common/utils/util';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
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
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

interface IAaveV3LendContext {
  allReservedTokens: { tokenAddress: string; symbol: string }[];
  allATokens: { tokenAddress: string; symbol: string }[];
  reserveTokensAddresses: any;
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
    protected accountService: AccountService,
    protected priceService: PriceService,
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
          supplied: [
            {
              token: { address: reservedPool.tokenAddress.toLowerCase() },
              totalSupplied: totalAToken.toString(),
              rate: { supplyRate: liquidityRate.toString() },
            },
          ],
          borrowed: [
            {
              token: { address: reservedPool.tokenAddress.toLowerCase() },
              totalBorrowed: (totalVariableDebt as BigNumber).plus(totalStableDebt).toString(),
              rate: borrowRate,
            },
          ],
          rewarded: rewards.map((rewardAddr) => ({ token: { address: rewardAddr.toLowerCase() } })),
        };
      },
    );
  }

  async initialize() {
    this.logger.log(
      `Initializing: ${this.meta.name} ${this.meta.chain}/${this.meta.address}`,
      `SingleContractProtocol/${this.constructor.name}`,
    );

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

    this.logger.log(
      `${this.meta.chain}/${this.meta.address} found ${Object.keys(this.functions).length}/${
        Object.keys(this.functionPredicates).length
      } functions`,
      `SingleContractProtocol/${this.constructor.name}`,
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

  protected async fetchUserData(addresses: Address[], pools: ILendingFeatureOpportunity[]) {
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

    const calls = new Map();
    addresses.forEach((address) => {
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
      return pools.forEach((pool) => {
        calls.set(
          `${pool.id}.userReserveData(${address})`,
          contract.createCall(
            this.functions.userReserveData,
            pool.supplied[0].token.address,
            address,
          ),
        );
      });
    });

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }

  protected formatBorrowApy(borrowed: IBorrowTokenMinimal) {
    return Object.entries(borrowed.rate)?.reduce((resp, [key, value]) => {
      // renames variableRate, stableRate => variableApy, stableApy (if present)
      return Object.assign(resp, {
        [key.replace('Rate', 'Apy')]: normalizeDecimals(value, AAVE_RATE_DECIMALS),
      });
    }, {});
  }

  protected formatSupplyApy(supplied: ISupplyTokenMinimal) {
    return {
      supplyApy: normalizeDecimals(supplied.rate.supplyRate, AAVE_RATE_DECIMALS),
    };
  }

  async getUsersData(
    addresses: Address[],
  ): Promise<[Map<Address, ILendingFeatureUserEntry[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();

    const results = new Map<Address, ILendingFeatureUserEntry[]>(
      addresses.map((address) => [address, [] as ILendingFeatureUserEntry[]]),
    );

    try {
      const multicallResults = await this.fetchUserData(addresses, pools);

      addresses.forEach((address) => {
        const supplyTokens = [];
        const borrowTokens = [];
        let rewardTokens;
        pools.forEach((pool) => {
          if (!rewardTokens) rewardTokens = pool.rewarded.map((reward) => reward.token);
          const {
            output: {
              data: { currentATokenBalance, currentStableDebt, currentVariableDebt },
            },
          } = multicallResults.get(`${pool.id}.userReserveData(${address})`);
          if (Number(currentATokenBalance) > 0) {
            supplyTokens.push(this.formatLendingUserData(pool.supplied[0], currentATokenBalance));
          }
          if (Number(currentVariableDebt) > 0) {
            delete pool.borrowed[0].apy.stableApy;
            borrowTokens.push(this.formatLendingUserData(pool.borrowed[0], currentVariableDebt));
          }
          if (Number(currentStableDebt) > 0) {
            delete pool.borrowed[0].apy.variableApy;
            borrowTokens.push(this.formatLendingUserData(pool.borrowed[0], currentStableDebt));
          }
        });

        const addressRewards = multicallResults.get(`${address}.rewards`)?.output.data;
        const { rewardsList, unclaimedAmounts } = addressRewards;
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

        const userHealthFactorRaw = multicallResults.get(`${address}.getUserAccountData`).output
          .data.healthFactor;

        results.get(address).push({
          feature: FeatureEnum.lending,
          chain: this.meta.chain,
          borrowed: borrowTokens,
          supplied: supplyTokens,
          rewarded: formattedRewards || [],
          debtRatio:
            borrowTokens.length || supplyTokens.length
              ? Math.min(toDecimals(userHealthFactorRaw, 18), 1_000_000)
              : 0,
        });
      });
    } catch (err) {
      errors.push(err);
    }
    return [results, errors];
  }

  formatLendingUserData(pool: IBorrowTokenOpportunity | ISupplyTokenOpportunity, balance: string) {
    const userBalance = toDecimals(balance, pool.token.decimals);
    let apy = null;
    if (pool.apy) {
      const variants = ['supplyApy', 'borrowApy', 'stableApy', 'variableApy'];
      for (const variant of variants) {
        if (pool.apy[variant]) {
          apy = pool.apy[variant];
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
      value: userBalance * pool.token.price,
      apr: breakdown,
      apy: breakdown,
    });
  }

  protected formatUserData(
    address: string,
    pool: ILendingFeatureOpportunity,
    data: any,
  ): ILendingFeatureUserEntry {
    const {
      output: {
        data: { currentATokenBalance, currentStableDebt, currentVariableDebt },
      },
    } = data.get(`${pool.id}.userReserveData(${address})`);

    const userTokenSupply = toDecimals(currentATokenBalance, pool.supplied[0].token.decimals);
    const userDebt =
      toDecimals(currentStableDebt, pool.borrowed[0].token.decimals) +
      toDecimals(currentVariableDebt, pool.borrowed[0].token.decimals);

    if (userDebt === 0 && userTokenSupply === 0) return;
    if (userTokenSupply !== 0) {
      Object.assign(pool.supplied[0], {
        amount: userTokenSupply,
        value: userTokenSupply * pool.supplied[0].token.price,
      });
    }

    if (userDebt !== 0) {
      Object.assign(pool.borrowed[0], {
        amount: userDebt,
        value: userDebt * pool.borrowed[0].token.price,
      });
    }
    return pool as ILendingFeatureUserEntry;
  }
}
