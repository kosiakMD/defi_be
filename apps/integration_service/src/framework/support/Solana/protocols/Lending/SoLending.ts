/* eslint-disable max-classes-per-file */
import { PublicKey } from '@solana/web3.js';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IPoolDataProtocolResponse, IProtocolMeta, IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import {
  ILendingFeatureUserEntry,
} from '../../../interfaces/feature.lending.interface';
import {
  IBorrowTokenUserEntity,
  IBorrowTokenOpportunity,
  IBorrowTokenMinimal
} from '../../../interfaces/tokens.borrowed.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
  ISupplyTokenMinimal
} from '../../../interfaces/tokens.supplied.interface';
import { ObligationParser } from '../../Schemas/Solend/Obligation';
import { ReserveParser } from '../../Schemas/Solend/Reserve';
import { SolanaCore } from '../../SolanaCore';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';

export interface ISolendingMeta extends IProtocolMeta {
  baseApiUrl: string, address: string
}

type SolendLendingFeatureEntryMinimal = BaseWithTokens<
  (ISupplyTokenMinimal & { reserveAddress: string })[],
  (IRewardTokenMinimal & { reserveAddress: string, apy: string })[],
  (IBorrowTokenMinimal & { reserveAddress: string })[]
>;
type SolendLendingFeatureOpportunity = BaseWithTokens<
  (ISupplyTokenOpportunity & { reserveAddress: string })[],
  (IRewardTokenOpportunity & { reserveAddress: string })[],
  (IBorrowTokenOpportunity & { reserveAddress: string })[]
>;

export class SoLending
  extends SolanaCore<
    SolendLendingFeatureEntryMinimal,
    SolendLendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    ISolendingMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected web3Service: Web3SolanaProviderService,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<SolendLendingFeatureEntryMinimal[]> {
    const { markets, assets } = await this.getConfig()
    const assetSymbolToAddressMap = this.createSymbolToAddressMap(assets);

    const reserveAddressToDetailsMap: Map<string, any> =
      await this.getReserveAddressToDetailsMap();

    return markets.map((market) => ({
      id: market.address,
      chain: this.meta?.chain,
      debtRatio: 0,
      feature: FeatureEnum.lending,
      supplied: market.reserves.map((reserve) => ({
        token: {
          address: assetSymbolToAddressMap.get(reserve.asset),
        },
        reserveAddress: reserve.address,
        totalSupplied: reserveAddressToDetailsMap?.get(reserve.address)?.reserve?.collateral
          ?.mintTotalSupply.toString(),
      })),
      rewarded: reserveAddressToDetailsMap ? market.reserves.reduce((acc, reserve) => {
        const reserveDetails = reserveAddressToDetailsMap.get(reserve.address);
        if(!reserveDetails) {
          return acc;
        }

        return [
          ...acc,
          ...reserveDetails.rewards.map(({ side, rewardMint, apy }) => ({
            token: {
              address: rewardMint,
            },
            rewardedForLendingSide: side === 'borrow' ? 'borrowed' : 'supplied',
            rewardedForTokenAddress: assetSymbolToAddressMap.get(reserve.asset),
            apy
          })),
        ];
      }, []) : [],
      borrowed: market.reserves.map((reserve) => ({
        token: {
          address: assetSymbolToAddressMap.get(reserve.asset),
        },
        reserveAddress: reserve.address,
        totalBorrowed: reserveAddressToDetailsMap?.get(reserve.address)?.reserve?.liquidity
          ?.borrowedAmountWads.toString(),
      })),
    }));
  }

  private async getConfig() {
    return this.getOrSet(60 * 60 * 24, 'solend_config_response', async () => {
      return (
        await firstValueFrom(
          this.httpService.get(this.meta.baseApiUrl + '/config/?deployment=production'),
        )
      ).data;
    });
  }

  async getFormattedPoolData(): Promise<IPoolDataProtocolResponse<SolendLendingFeatureOpportunity>> {
    const { data: markets, errors } = await this.getPoolData()


    return {
      data: markets.flatMap(market => {
        return [
          ...market.supplied.map(supplied => {
            const rewarded = market.rewarded.filter(r => r.rewardedForLendingSide === 'supplied' && r.rewardedForTokenAddress === supplied.token.address)
            return {
              ...market,
              id: `${market.id}::${supplied.token.address}`,
              supplied: [supplied],
              rewarded,
              borrowed: [] //; hide borrowed details for opportunity data
            }
          })
        ]
      }),
      errors
    }
  }

  private async getReserveAddressToDetailsMap(): Promise<Map<string, any> | undefined> {
    const config = await this.getConfig()
      const markets = config.markets;
      const reserveAddresses = markets.reduce(
        (acc, market) => [...acc, ...market.reserves.map(({ address }) => address)],
        [],
      );
      const reserveDetailsPromises = reserveAddresses.map(x => {
        return firstValueFrom(this.httpService.get(this.meta.baseApiUrl + '/reserves/?ids=' + x)).catch(() => null)
      });

      let reserveDetails;
      const notFoundReserveIndexes = [];

     try {
      const cacheKey = 'solend_reserves_response';
      const cached = await this.cache.get<Map<string, any>>(cacheKey);
      if (cached) reserveDetails = cached;


      reserveDetails = (await Promise.all(reserveDetailsPromises)).filter((x, index) => {
        if(!x) {
          notFoundReserveIndexes.push(index);
        }
        return x;
      }).map(x => x.data.results[0]);

        await this.cache.set(cacheKey, reserveDetails);
     } catch(e) {
       this.logger.error(e);
       return;
     }

       return this.createMapFromArrays(reserveAddresses.filter((_, index) => !notFoundReserveIndexes.includes(index)), reserveDetails);
  }

  protected formatOpportunity(
    opportunity: SolendLendingFeatureEntryMinimal,
    tokens: Map<string, any>,
  ): void | SolendLendingFeatureOpportunity {
    const tokenAddressToTvlMap = new Map();

    const supplied = opportunity.supplied.filter(x => tokens.has(x.token.address)).map((poolToken) => {
      const token = tokens.get(poolToken.token.address);
      const totalSupplied = normalizeDecimals(poolToken.totalSupplied, token.decimals)
      const tvl = new BN(token.price).multipliedBy(new BN(totalSupplied))
                                     .toNumber();

      tokenAddressToTvlMap.set(poolToken.token.address, tvl);

      return {
        token,
        totalSupplied,
        reserveAddress: poolToken.reserveAddress,
        tvl,
      };
    });

    const borrowed = opportunity.borrowed.filter(x => tokens.has(x.token.address)).map((poolToken) => {
      const token = tokens.get(poolToken.token.address);
      const totalBorrowed = normalizeDecimals(poolToken.totalBorrowed, token.decimals);

      const tvl = new BN(token.price).multipliedBy(new BN(totalBorrowed))
                                     .toNumber();

      tokenAddressToTvlMap.set(poolToken.token.address, tvl);

      return {
        token,
        totalBorrowed,
        reserveAddress: poolToken.reserveAddress,
        tvl,
      };
    });

    return {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      supplied,
      borrowed,
      rewarded: opportunity.rewarded.filter(x => tokens.has(x.token.address)).map((poolToken) => {

        const token = tokens.get(poolToken.token.address);
        const apyPercentage = +poolToken.apy / 100;

        const apyBreakdown = {
          day: apyPercentage / 365,
          week: apyPercentage / 52,
          month: apyPercentage / 12,
          year: apyPercentage,
        };

        const rewardedForTvl = tokenAddressToTvlMap.get(poolToken.rewardedForTokenAddress);

        return {
          token,
          rewardedForTokenAddress: poolToken.rewardedForTokenAddress,
          rewardedForLendingSide: poolToken.rewardedForLendingSide,
          reserveAddress: poolToken.reserveAddress,
          harvests: {
            day: (apyBreakdown.day * rewardedForTvl) / token.price,
            week: (apyBreakdown.week * rewardedForTvl) / token.price,
            month: (apyBreakdown.month * rewardedForTvl) / token.price,
            year: (apyBreakdown.year * rewardedForTvl) / token.price,
          },
          apy: apyBreakdown,
          apr: apyBreakdown
        };
      }),

    };
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<ILendingFeatureUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();
    const wallets: Map<string, ILendingFeatureUserEntry[]> = new Map();
    const combinedErrors = [...errors];

    try {
      const reserveAddressToDetailsMap = await this.getReserveAddressToDetailsMap();

      for (const userAddress of addresses) {
        const userPositions: ILendingFeatureUserEntry[] = [];

        for (const pool of pools) {
          const lendingMarketAddress = pool.id;
          const seed = lendingMarketAddress.slice(0, 32);
          const obligationAddress = await PublicKey.createWithSeed(
            new PublicKey(userAddress),
            seed,
            new PublicKey(this.meta.address),
          );

          const poolTokensAddressesToOpportunityMap: Map<
            string,
            (IBorrowTokenOpportunity | ISupplyTokenOpportunity) & { reserveAddress: string }
          > = this.createMapFromArrays(
            [
              ...pool.borrowed.map((x) => x.token.address),
              ...pool.supplied.map((x) => x.token.address),
            ],
            [...pool.borrowed, ...pool.supplied],
          );

          const rawObligation = await this.web3Service
            .getInstanceByChainId(ChainIdEnum.sol)
            .getAccountInfo(obligationAddress);

          if (!rawObligation) {
            continue;
          }
          const obligation = ObligationParser(rawObligation);

          const borrowed: IBorrowTokenUserEntity[] = [];

          let totalValueBorrowed = 0;
          for (const borrow of obligation.info.borrows as any) {

            const rawBorrowReserve = await this.web3Service
              .getInstanceByChainId(ChainIdEnum.sol)
              .getAccountInfo((borrow as any).borrowReserve);

            const borrowReserve = ReserveParser(rawBorrowReserve);
            const borrowedTokenAddress = borrowReserve.info.liquidity.mintPubkey.toString();
            const borrowedOpportunity =
            poolTokensAddressesToOpportunityMap.get(borrowedTokenAddress) as IBorrowTokenOpportunity & { reserveAddress: string };

            const borrowReserveDetailsFromApi = reserveAddressToDetailsMap?.get(borrowedOpportunity.reserveAddress);
            const normalizedBorrowedAmount = normalizeDecimals(borrow.borrowedAmountWads.toString(), borrowedOpportunity.token.decimals + 18);

            const valueBorrowed = borrowedOpportunity.token.price ? new BN(normalizedBorrowedAmount).multipliedBy(borrowedOpportunity.token.price)
                                                                                                    .toNumber()
                                                                  : normalizeDecimals(borrow.marketValue.toString(), 18);

            totalValueBorrowed += valueBorrowed;

            borrowed.push({
              apy: { variableApy: +borrowReserveDetailsFromApi?.rates?.borrowInterest },
              tvl: borrowedOpportunity.tvl,
              token: borrowedOpportunity.token,
              amount: normalizedBorrowedAmount,
              value: valueBorrowed,
            });
          };

          const supplied: ISupplyTokenUserEntry[] = [];

          let totalValueSuppliedFactoredByLiquidationThreshold = 0;

          for (const deposit of obligation.info.deposits as any) {

            const rawDepositReserve = await this.web3Service
              .getInstanceByChainId(ChainIdEnum.sol)
              .getAccountInfo((deposit as any).depositReserve);
            const depositReserve = ReserveParser(rawDepositReserve);
            const depositTokenAddress = depositReserve.info.liquidity.mintPubkey.toString();
            // eslint-disable-next-line prettier/prettier
            const depositOpportunity = <ISupplyTokenOpportunity & { reserveAddress: string }>(poolTokensAddressesToOpportunityMap.get(depositTokenAddress) as unknown);

            const depositReserveDetailsFromApi = reserveAddressToDetailsMap.get(depositOpportunity.reserveAddress);

            const totalSuppliedByAllUsers = normalizeDecimals(depositReserve.info.collateral.mintTotalSupply.toString(), depositOpportunity.token.decimals);

            const normalizedDepositAmount = normalizeDecimals(
              deposit.depositedAmount.toString(),
              depositOpportunity.token.decimals,
            );

            const depositValue = depositOpportunity.token.price ? new BN(normalizedDepositAmount).multipliedBy(depositOpportunity.token.price)
                                                                                                 .toNumber()
                                                                : normalizeDecimals(deposit.marketValue.toString(), 18);

            if(depositValue > 0) {
              totalValueSuppliedFactoredByLiquidationThreshold += new BN(depositValue).multipliedBy(depositReserve.info.config.liquidationThreshold)
                                                                                      .dividedBy(new BN(100))
                                                                                      .toNumber();
            }

            supplied.push({
              apy: { variableApy: +depositReserveDetailsFromApi?.rates?.supplyInterest },
              token: depositOpportunity.token,
              amount: normalizedDepositAmount,
              value: depositValue,
              totalSupplied: depositOpportunity.totalSupplied,
              tvl: depositOpportunity.token.price ? new BN(depositOpportunity.token.price).multipliedBy(new BN(totalSuppliedByAllUsers))
                                                                                          .toNumber() : 0,
            });
          };

          userPositions.push({
            id: 'solend-lending',
            chain: ChainIdEnum.sol,
            feature: FeatureEnum.lending,
            borrowed,
            rewarded: [],
            supplied,
            debtRatio: new BN(totalValueSuppliedFactoredByLiquidationThreshold).dividedBy(new BN(totalValueBorrowed ? totalValueBorrowed : 1))
                                                                               .toNumber(),
          });
        }

        wallets.set(userAddress, userPositions);
      }
    } catch (err) {
      combinedErrors.push(err);
    }

    return { data: wallets, errors: combinedErrors};
  }

  private createSymbolToAddressMap(assets) {
    return new Map(assets.map(x => [x.symbol, x.mintAddress]))
  }

  private createMapFromArrays<T,G>(array1: T[], array2: G[]) {
    return new Map<T,G>(array1.map((x,i) => [x, array2[i]]))
  }
}
