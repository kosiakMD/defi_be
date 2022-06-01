import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { aprToApy, apyToApr, normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { toDecimals } from '../../../../../common/utils/util';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates, IRootProtocol, TokenMap } from '../../../interfaces';
import { ILendingFeatureUserEntry } from '../../../interfaces/feature.lending.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from '../../../interfaces/tokens.borrowed.interface';
import {
  ERC20TokenWithUnderlingMinimal,
  ITokenOpportunity,
} from '../../../interfaces/tokens.common.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { CombinedMultiContractProtocol } from '../../CombinedMultiContractProtocol';

export interface IYarnApyDataResponse {
  address: string;
  apy: {
    net_apy: string;
  };
}

type IAlchemixLendingFeatureEntryMinimal = BaseWithTokens<
  IAlchemixSupplyTokenMinimal,
  void,
  IBorrowTokenMinimal
>;

type IAlchemixLendingFeatureOpportunity = BaseWithTokens<
  IAlchemixISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity
>;

export interface IAlchemixTokenMinimal {
  token: ERC20TokenWithUnderlingMinimal;
}

export interface IAlchemixSupplyTokenMinimal extends IAlchemixTokenMinimal {
  totalSupplied: string;
  pricePerShare: string;
  rate: { [key: string]: string };
}

export interface IAlchemixISupplyTokenOpportunity extends ITokenOpportunity {
  pricePerShare: number;
  totalSupplied: number;
  tvl: number;
  apy: { [key: string]: number };
}

export class AlchemixV2Vaults
  extends CombinedMultiContractProtocol<
    IAlchemixLendingFeatureEntryMinimal,
    IAlchemixLendingFeatureOpportunity,
    ILendingFeatureUserEntry
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
    protected httpService: HttpService,
  ) {
    super();
  }

  readonly yearnPoolsAPYsUrl = `https://api.yearn.finance/v1/chains/1/vaults/all`;
  readonly lidoEthRatesUrl = `https://stake.lido.fi/api/steth-apr`;

  /*******
   * temp solution until assets-service is live. The protocol uses same APR for stETH and wstETH
   *   so we need this array to identify if it's a Lido token.
   */
  readonly lidoLPTokens = [
    `0xae7ab96520de3a18e5e111b5eaab095312d7fe84`,
    `0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0`,
  ];

  functionPredicates: INamedFunctionPredicates = {
    totalAssets: () => (item) => ['totalAssets', 'totalSupply'].includes(item.name),
    pricePerShare: () => (item) =>
      ['pricePerShare', 'stEthPerToken', 'getExchangeRate'].includes(item.name),
    name: () => (item) => item.name === 'name',
  };

  mainContractFunctionPredicates: INamedFunctionPredicates = {
    supportedYieldTokens: () => (item) => item.name === 'getSupportedYieldTokens',
    debtToken: () => (item) => item.name === 'debtToken',
    positions: () => (item) => item.name === 'positions',
    accounts: () => (item) => item.name === 'accounts',
    getYieldTokenParameters: () => (item) => item.name === 'getYieldTokenParameters',
  };

  protected async fetchOpportunityData(context: {
    [p: string]: any;
  }): Promise<IAlchemixLendingFeatureEntryMinimal[]> {
    const contract = this.getMainContract();

    const pools = this.getPoolsFromContractData();

    const yieldTokenParams = await this.multicall.callArray(
      pools.map((token) =>
        contract.createCall(this.mainContractFunctions.getYieldTokenParameters, token),
      ),
      this.meta.chain,
    );

    const poolsRates = await this.GetPoolsRates(pools);

    const tokensData = pools.map((address, index) => {
      const totalStaked: string = yieldTokenParams[index].activeBalance;
      const underlyingTokenAddress: string = yieldTokenParams[index].underlyingToken;

      const pricePerShare = context.poolsData
        .get(this.callLabel(this.functionsPerPool.get(address).pricePerShare.name, address))
        .output.data.toString();

      return {
        feature: this.meta.feature,
        chain: this.meta.chain,
        id: address,
        supply: {
          token: {
            address: address,
            underlying: [
              {
                address: underlyingTokenAddress.toLowerCase(),
              },
            ],
          },
          totalSupplied: totalStaked,
          rate: { supplyRate: poolsRates.get(address) },
          pricePerShare: pricePerShare,
        },
        borrow: {
          token: { address: this.mainProtocolData.debtToken },
        },
        rewarded: [],
      };
    });

    return tokensData;
  }

  protected async GetPoolsRates(pools: string[]): Promise<Map<string, number>> {
    const poolData = new Map();

    const lidoRateResponse = await firstValueFrom(this.httpService.get(this.lidoEthRatesUrl));

    const yearnPools = await firstValueFrom(
      this.httpService
        .get<IYarnApyDataResponse[]>(this.yearnPoolsAPYsUrl)
        .pipe(map((response) => response.data)),
    );

    const yearnPoolMap = new Map(
      yearnPools.map((yearnPool) => [yearnPool.address.toLowerCase(), yearnPool]),
    );

    pools.forEach((poolAddress) => {
      const matchedYearnPool = yearnPoolMap.get(poolAddress.toLowerCase());

      if (matchedYearnPool && matchedYearnPool.apy) {
        poolData.set(poolAddress, apyToApr(Number(matchedYearnPool.apy.net_apy), 365));
        return;
      }

      const lidoMatchedAddress = this.lidoLPTokens.filter(
        (lidoAddress) => lidoAddress.toLowerCase() === poolAddress.toLowerCase(),
      );

      if (lidoMatchedAddress && lidoMatchedAddress.length > 0) {
        poolData.set(poolAddress, +lidoRateResponse.data / 100);
        return;
      }

      this.logger.warn(`APY data is missing for:AlchemixV2, pool: ${poolAddress}`);
    });

    return poolData;
  }

  protected formatOpportunity(
    pool: IAlchemixLendingFeatureEntryMinimal,
    tokens: TokenMap,
  ): void | IAlchemixLendingFeatureOpportunity {
    const suppliedOpportunity = pool.supply;
    const borrowedOpportunity = pool.borrow;

    const suppliedToken = tokens.get(suppliedOpportunity.token.address.toLowerCase());

    const suppliedUnderlyingToken = tokens.get(
      suppliedOpportunity.token.underlying[0].address.toLowerCase(),
    );

    const borrowedToken = tokens.get(borrowedOpportunity.token.address.toLowerCase());

    if (!suppliedToken || !borrowedToken) {
      throw new Error(
        `Token missing for pool: ${pool.id}, protocol: AlchemixV2/${this.meta.address}`,
      );
    }

    const pricePerShare = Number(
      new BigNumber(parseInt(suppliedOpportunity.pricePerShare, 10))
        .dividedBy(new BigNumber(10).pow(suppliedToken.decimals))
        .toString(),
    );

    //not all of the pools can have rates fetched
    const apy = suppliedOpportunity.rate.supplyRate
      ? aprToApy(Number(suppliedOpportunity.rate.supplyRate))
      : undefined;

    const totalSupplied = normalizeDecimals(
      suppliedOpportunity.totalSupplied,
      suppliedToken.decimals,
    );

    const totalBorrowed = normalizeDecimals(
      borrowedOpportunity.totalBorrowed,
      borrowedToken.decimals,
    );
    const tvl = totalSupplied * suppliedUnderlyingToken.price * pricePerShare;
    const borrowTvl = totalBorrowed * borrowedToken.price;

    return {
      feature: pool.feature,
      id: pool.id,
      chain: pool.chain,
      borrow: {
        token: borrowedToken,
        tvl: borrowTvl,
      },
      supply: {
        token: suppliedToken,
        totalSupplied,
        tvl,
        pricePerShare: pricePerShare,
        apy: { supplyApy: apy },
      },
    };
  }

  protected async fetchUserData(addresses: Address[], pools: IAlchemixLendingFeatureOpportunity[]) {
    const contract = this.getMainContract();
    const calls = new Map();

    addresses.forEach((address) => {
      calls.set(
        this.callLabel(`accounts`, address),
        contract.createCall(this.mainContractFunctions.accounts, address),
      );

      return pools.forEach((pool) => {
        calls.set(
          this.callLabel(`positions`, address, pool.id),
          contract.createCall(
            this.mainContractFunctions.positions,
            address,
            pool.supply.token.address,
          ),
        );
      });
    });

    return await this.multicall.handleInBatches(calls, this.meta.chain);
  }

  async getUsersData(
    addresses: Address[],
  ): Promise<{ data: Map<Address, ILendingFeatureUserEntry[]>; errors: Error[] }> {
    const { data: pools, errors } = await this.getPoolData();

    const results = new Map<Address, ILendingFeatureUserEntry[]>(
      addresses.map((address) => [address, [] as ILendingFeatureUserEntry[]]),
    );

    try {
      const multicallResults = await this.fetchUserData(addresses, pools);

      addresses.forEach((address) => {
        const supplyTokens: ISupplyTokenUserEntry[] = [];
        const borrowTokens: IBorrowTokenUserEntity[] = [];

        const debtToken = pools[0].borrow.token;

        const borrowedSharePerUser = toDecimals(
          multicallResults.get(this.callLabel(`accounts`, address)).output.data.debt,
          debtToken.decimals,
        );

        const borrowedTotal = borrowedSharePerUser * debtToken.price;

        const borrowedEntity: IBorrowTokenUserEntity = {
          tvl: undefined,
          token: debtToken,
          amount: borrowedSharePerUser,
          value: borrowedTotal,
        };

        borrowTokens.push(borrowedEntity);

        pools.forEach((pool) => {
          const suppliedOpportunity = pool.supply;

          const tokensSupplied = toDecimals(
            multicallResults.get(this.callLabel(`positions`, address, pool.id)).output.data.shares,
            suppliedOpportunity.token.decimals,
          );

          if (tokensSupplied === 0) return;

          const suppliedTotal = this.tryCalculateBalanceForTokenSupplied(
            suppliedOpportunity,
            tokensSupplied,
          );

          if (suppliedTotal === 0) {
            this.logger.error(
              `Balance calculation error for AlchemixV2, token: ${suppliedOpportunity.token.address}`,
            );
          }

          const suppliedEntity: ISupplyTokenUserEntry = {
            tvl: suppliedOpportunity.tvl,
            apy: { supplyApy: suppliedOpportunity.apy?.supplyApy * 100 },
            token: suppliedOpportunity.token,
            totalSupplied: suppliedOpportunity.totalSupplied,
            amount: tokensSupplied,
            value: suppliedTotal,
          };

          supplyTokens.push(suppliedEntity);
        });

        results.get(address).push({
          id: supplyTokens[0].token.address,
          feature: FeatureEnum.lending,
          chain: this.meta.chain,
          borrowed: borrowTokens,
          supplied: supplyTokens,
          rewarded: [],
          debtRatio: 0,
        });
      });
    } catch (err) {
      errors.push(err);
    }

    return { data: results, errors };
  }

  //temp method until asset service is in place
  private tryCalculateBalanceForTokenSupplied(
    pool: IAlchemixISupplyTokenOpportunity,
    tokensSupplied: number,
  ): number {
    if (pool.token.price > 0) {
      return tokensSupplied * pool.token.price;
    }

    if (pool.token.price === 0 && pool.token.underlying.length > 0) {
      return tokensSupplied * pool.pricePerShare * pool.token.underlying[0].price;
    }
  }

  protected formatUserData(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: Address,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pool: IAlchemixLendingFeatureOpportunity,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: any,
  ): ILendingFeatureUserEntry {
    return undefined;
  }
}
