import { AaveSubgraph } from 'apps/integration_service/src/modules/subgraphs/subgraphs/aave.subgraph';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { toDecimals } from '../../../../../common/utils/util';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
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
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { EVMCore } from '../../EVMCore';

// interface IAaveV3LendContext {
//   allReservedTokens?: { tokenAddress: string; symbol: string }[];
//   allATokens?: { tokenAddress: string; symbol: string }[];
//   reserveTokensAddresses?: any;
// }

export interface AaveV2Reserve {
  id: Address;
  name: string;
  underlyingAsset: Address;
  symbol: string;
  decimals: number;
  liquidityRate: string;
  stableBorrowRate: string;
  variableBorrowRate: string;
  totalCurrentVariableDebt: string;
  totalPrincipalStableDebt: string;
  totalATokenSupply: string;
  aToken: { id: Address };
  sToken: { id: Address };
  vToken: { id: Address };
}

const AAVE_RATE_DECIMALS = 27;
export interface IAaveV22Meta extends IProtocolMeta {
  feature: FeatureEnum.lending;
  address: Address;
  pool: Address;
  incentives: Address;
  //   context: IAaveV3LendContext;
  name: string;
}

export class AaveV2Lending
  extends EVMCore<
    ILendingFeatureEntryMinimal,
    ILendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    IAaveV22Meta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    private readonly subgraph: AaveSubgraph,
    protected priceService: PriceService,
  ) {
    super();
  }

  poolFunctions: INamedFunctions = {};
  incentivesFunctions: INamedFunctions = {};

  protected poolFunctionPredicates: INamedFunctionPredicates = {
    getUserAccountData: () => (item) => item.name === 'getUserAccountData',
  };

  protected incentivesFunctionsPredicates: INamedFunctionPredicates = {
    getRewardsBalance: () => (item) => item.name === 'getRewardsBalance',
    rewardToken: () => (item) => item.name === 'REWARD_TOKEN',
  };

  async getCacheableOpportunityData(): Promise<ILendingFeatureEntryMinimal[]> {
    // const contract = this.getMainContract();
    const incentivesContract = new DynamicContract(this.meta.incentives);

    const rewardTokenCall = incentivesContract.createCall(this.incentivesFunctions.rewardToken);

    const rewardToken = await this.multicall.call(rewardTokenCall, this.meta.chain);
    const reserves: AaveV2Reserve[] = (await this.subgraph.getReserves(this.meta.chain)) as any;

    return reserves.map(
      (
        {
          aToken,
          sToken,
          vToken,
          underlyingAsset,
          variableBorrowRate,
          stableBorrowRate,
          liquidityRate,
          totalCurrentVariableDebt,
          totalPrincipalStableDebt,
          totalATokenSupply,
        },
        index,
      ) => {
        const borrowRate = {};
        this.updateBorrowRateField(
          'variableRate',
          variableBorrowRate,
          totalCurrentVariableDebt,
          borrowRate,
        );

        this.updateBorrowRateField(
          'stableRate',
          stableBorrowRate,
          totalPrincipalStableDebt,
          borrowRate,
        );

        return {
          feature: this.meta.feature,
          chain: this.meta.chain,
          id: aToken.id,
          supplied: [
            {
              token: { address: underlyingAsset.toLowerCase() },
              totalSupplied: totalATokenSupply.toString(),
              rate: { supplyRate: liquidityRate.toString() },
            },
          ],
          borrowed: [
            {
              token: { address: underlyingAsset.toLowerCase() },
              totalBorrowed: new BigNumber(totalCurrentVariableDebt as any)
                .plus(new BigNumber(totalPrincipalStableDebt as any))
                .toString(),
              rate: borrowRate,
            },
          ],
          rewarded: [
            {
              token: { address: rewardToken.toLowerCase() },
            },
          ],
        };
      },
    );
  }

  async initialize() {
    this.logger.log(
      `Initializing: ${this.meta.name} ${this.meta.chain}/${this.meta.address}`,
      `SingleContractProtocol/${this.constructor.name}`,
    );

    this.poolFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.pool,
      this.meta.chain, // TODO: update to this.meta.chain once they are verified
      this.poolFunctionPredicates,
    );

    this.incentivesFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.incentives,
      this.meta.chain,
      this.incentivesFunctionsPredicates,
    );

    this.logger.log(
      `${this.meta.chain}/${this.meta.address} found ${Object.keys(this.poolFunctions).length}/${
        Object.keys(this.poolFunctionPredicates).length
      } functions`,
      `EVMCore/${this.constructor.name}`,
    );
  }

  protected updateBorrowRateField(field: string, rate: string, debtValue: string, borrowRate: any) {
    if (Number(debtValue) > 0) {
      borrowRate[field] = rate;
    }
  }

  async getUsersData(
    addresses: string[],
  ): Promise<{ data: Map<string, ILendingFeatureUserEntry[]>; errors: Error[] }> {
    // const contract = this.getMainContract();
    const { data: pools, errors } = await this.getPoolData();

    const wallets = new Map();
    // const poolContract = new DynamicContract(this.meta.pool);
    // const incentives = new DynamicContract(this.meta.incentives);

    for (const address of addresses) {
      const supplyTokens = [];
      const borrowTokens = [];
      const rewardTokens = [];
      wallets.set(address, [
        {
          feature: FeatureEnum.lending,
          id: 'aave-lending',
          chain: this.meta.chain,
          borrowed: borrowTokens,
          supplied: supplyTokens,
          rewarded: rewardTokens,
          debtRatio: 0,
        },
      ]);
    }

    // const calls = new Map();
    // calls.set(
    //   `${address}.rewards`,
    //   incentivesV3.createCall(
    //     this.incentivesFunctions.allUserRewards,
    //     this.meta.context.allATokens.map((data) => data.tokenAddress),
    //     address,
    //   ),
    // );
    // calls.set(
    //   `${address}.getUserAccountData`,
    //   poolContract.createCall(poolFunctions.getUserAccountData, address),
    // );
    // pools.forEach((pool) => {
    //   calls.set(
    //     `${pool.id}.userReserveData(${address})`,
    //     contract.createCall(
    //       this.poolFunctions.userReserveData,
    //       pool.supplied[0].token.address,
    //       address,
    //     ),
    //   );
    // });

    // const multicallResults = await this.multicall.handleInBatches(calls, this.meta.chain);

    // const { healthFactor } = multicallResults.get(`${address}.getUserAccountData`).output.data;

    return { data: wallets, errors };
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
}
