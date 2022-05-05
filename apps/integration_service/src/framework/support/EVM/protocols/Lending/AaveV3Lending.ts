import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { AbiItem } from 'web3-utils';

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
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import {
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
} from '../../../interfaces/feature.lending.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

interface IAaveV3LendContext {
  allReservedTokens: { address: string; symbol: string }[];
}

export interface IAaveV3Meta extends IProtocolMeta {
  feature: FeatureEnum.lending;
  address: Address;
  pool: Address;
  context: any;
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

  protected functionPredicates: INamedFunctionPredicates = {
    allReservedTokens: () => (item) => item.name === 'getAllReservesTokens',
    reserveData: () => (item) => item.name === 'getReserveData',
    userReserveData: () => (item) => item.name === 'getUserReserveData',
    reserveTokensAddresses: () => (item) => item.name === 'getReserveTokensAddresses',
  };

  protected async fetchOpportunityData(
    context: IAaveV3LendContext,
  ): Promise<ILendingFeatureEntryMinimal[]> {
    const contract = this.getMainContract();

    const reservesDataResp = await this.multicall.callArray(
      context.allReservedTokens.map((token) =>
        contract.createCall(this.functions.reserveData, token.address),
      ),
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
          id: reservedPool.symbol,
          debtRatio: 0,
          supplied: [
            {
              token: { address: reservedPool.address },
              totalSupplied: totalAToken.toString(),
              rate: { supplyRate: liquidityRate.toString() },
            },
          ],
          borrowed: [
            {
              token: { address: reservedPool.address },
              totalBorrowed: (totalVariableDebt as BigNumber).plus(totalStableDebt).toString(),
              rate: borrowRate,
            },
          ],
          rewarded: [],
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
      this.meta.chain === ChainIdEnum.ftm ? ChainIdEnum.plg : this.meta.chain,
      this.functionPredicates,
    );

    this.logger.log(
      `${this.meta.chain}/${this.meta.address} found ${Object.keys(this.functions).length}/${
        Object.keys(this.functionPredicates).length
      } functions`,
      `SingleContractProtocol/${this.constructor.name}`,
    );
  }

  updateBorrowRateField(field: string, rate: BigNumber, debtValue: BigNumber, borrowRate: any) {
    if (Number(debtValue) > 0) {
      borrowRate[field] = rate.toString();
    }
  }

  protected fetchUserData(addresses: Address[], pools: ILendingFeatureOpportunity[]) {
    const contract = this.getMainContract();
    const poolContract = new DynamicContract(this.meta.pool);

    const calls = new Map();
    addresses.forEach((address) => {
      calls.set(
        `${address}.getUserAccountData`,
        poolContract.createCall(abiGetUserAccountData, address),
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

  protected formatOpportunity(
    pool: ILendingFeatureEntryMinimal,
    tokens: TokenMap,
  ): void | ILendingFeatureOpportunity {
    const suppliedToken = tokens.get(pool.supplied[0].token.address.toLowerCase());
    const borrowedToken = tokens.get(pool.borrowed[0].token.address.toLowerCase());
    if (!suppliedToken || !borrowedToken) return;
    const totalSupplied = normalizeDecimals(pool.supplied[0].totalSupplied, suppliedToken.decimals);
    const totalBorrowed = normalizeDecimals(pool.borrowed[0].totalBorrowed, borrowedToken.decimals);
    const tvl = totalSupplied * suppliedToken.price;
    const borrowTvl = totalBorrowed * borrowedToken.price;

    const borrowApy = Object.entries(pool.borrowed[0].rate)?.reduce((resp, [key, value]) => {
      Object.assign(resp, { [key.replace('Rate', 'Apy')]: this.getApyFromRate(value) });
      return resp;
    }, {});

    return {
      feature: pool.feature,
      id: pool.id,
      chain: pool.chain,
      borrowed: [
        {
          token: borrowedToken,
          tvl: borrowTvl,
          apy: borrowApy,
        },
      ],
      supplied: [
        {
          token: suppliedToken,
          totalSupplied,
          tvl,
          apy: { supplyApy: this.getApyFromRate(pool.supplied[0].rate.supplyRate) },
        },
      ],
      rewarded: [],
    };
  }

  getApyFromRate(rate: string): number {
    return new BigNumber(rate) //
      .div(new BigNumber(10).pow(25))
      .toNumber();
  }

  protected async callInputlessFunctions() {
    // Prepare all inputless contract calls for automated multicall
    const inputlessCalls = Object.entries(this.functions).filter(
      ([, abiItem]) => !abiItem.inputs?.length,
    );

    // Execute multicall
    const contract = this.getMainContract();
    const results = await this.multicall.callArray(
      inputlessCalls.map(([, abiItem]) => contract.createCall(abiItem)),
      this.meta.chain,
    );

    return inputlessCalls.reduce((acc, [name]) => {
      acc[name] = results[0].map((item) => ({
        address: item['tokenAddress'],
        symbol: item['symbol'],
      }));
      return acc;
    }, this.meta.context ?? ({} as { [ley: string]: any }));
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
        pools.forEach((pool) => {
          const {
            output: {
              data: { currentATokenBalance, currentStableDebt, currentVariableDebt },
            },
          } = multicallResults.get(`${pool.id}.userReserveData(${address})`);
          if (Number(currentATokenBalance) > 0)
            supplyTokens.push(this.formatLendingUserData(pool, currentATokenBalance, 'supplied'));
          if (Number(currentVariableDebt) > 0) {
            delete pool.borrowed[0].apy.stableApy;
            borrowTokens.push(this.formatLendingUserData(pool, currentVariableDebt, 'borrowed'));
          }
          if (Number(currentStableDebt) > 0) {
            delete pool.borrowed[0].apy.variableApy;
            borrowTokens.push(this.formatLendingUserData(pool, currentStableDebt, 'borrowed'));
          }
        });
        const userHealthFactorRaw = multicallResults.get(`${address}.getUserAccountData`).output
          .data.healthFactor;

        results.get(address).push({
          feature: FeatureEnum.lending,
          chain: this.meta.chain,
          borrowed: borrowTokens,
          supplied: supplyTokens,
          rewarded: [],
          debtRatio: toDecimals(userHealthFactorRaw, 18),
        });
      });
    } catch (err) {
      errors.push(err);
    }
    return [results, errors];
  }

  formatLendingUserData(pool: ILendingFeatureOpportunity, balance: string, feature: string) {
    const featureObject = pool[feature][0];
    const userBalance = toDecimals(balance, featureObject.token.decimals);
    return Object.assign(featureObject, {
      amount: userBalance,
      value: userBalance * featureObject.token.price,
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

export const abiGetUserAccountData: AbiItem = {
  inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
  name: 'getUserAccountData',
  outputs: [
    { internalType: 'uint256', name: 'totalCollateralBase', type: 'uint256' },
    { internalType: 'uint256', name: 'totalDebtBase', type: 'uint256' },
    { internalType: 'uint256', name: 'availableBorrowsBase', type: 'uint256' },
    { internalType: 'uint256', name: 'currentLiquidationThreshold', type: 'uint256' },
    { internalType: 'uint256', name: 'ltv', type: 'uint256' },
    { internalType: 'uint256', name: 'healthFactor', type: 'uint256' },
  ],
  stateMutability: 'view',
  type: 'function',
};
