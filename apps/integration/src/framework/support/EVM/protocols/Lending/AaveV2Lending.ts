import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FeatureEnum } from '../../../enums';
import { MissingTokenException } from '../../../exceptions';
import {
  INamedFunctionPredicates,
  INamedFunctions,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import {
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
} from '../../../interfaces/feature.lending.interface';
import { IBorrowTokenUserEntity } from '../../../interfaces/tokens.borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { IRewardTokenUserEntry } from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { EVMCore } from '../../EVMCore';

export const RAY = new BigNumber(10).pow(27);

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

export interface IAaveV2Meta extends IProtocolMeta {
  feature: FeatureEnum.lending;
  address: Address;
  incentives?: Address;
  name: string;
}
export interface Aave2LendingFeatureMinimal extends ILendingFeatureEntryMinimal {
  sTokenAddress: Address;
  vTokenAddress: Address;
}
interface AaveLendingFeatureOpportunity extends ILendingFeatureOpportunity {
  sTokenAddress: Address;
  vTokenAddress: Address;
}
export class AaveV2Lending
  extends EVMCore<
    Aave2LendingFeatureMinimal,
    AaveLendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    IAaveV2Meta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
  ) {
    super();
  }

  poolFunctions: INamedFunctions = {};
  incentivesFunctions: INamedFunctions = {};

  protected poolFunctionPredicates: INamedFunctionPredicates = {
    getUserAccountData: () => (item) => item.name === 'getUserAccountData',
    getReserveData: () => (item) => item.name === 'getReserveData',
    getReservesList: () => (item) => item.name === 'getReservesList',
  };

  protected balanceOfFunction: INamedFunctionPredicates = {
    balanceOf: () => (item) => item.name === 'balanceOf',
  };

  protected incentivesFunctionsPredicates: INamedFunctionPredicates = {
    getRewardsBalance: () => (item) => item.name === 'getRewardsBalance',
    rewardToken: () => (item) => item.name === 'REWARD_TOKEN',
  };

  async getCacheableOpportunityData(): Promise<Aave2LendingFeatureMinimal[]> {
    const rewardTokens = [];
    if (this.meta.incentives) {
      const incentivesContract = new DynamicContract(this.meta.incentives);

      const rewardTokenCall = incentivesContract.createCall(this.incentivesFunctions.rewardToken);

      rewardTokens.push({
        token: {
          address: (await this.multicall.call(rewardTokenCall, this.meta.chain)).toLowerCase(),
        },
      });
    }
    const poolContract = new DynamicContract(this.meta.address);

    const reserveListCall = poolContract.createCall(this.poolFunctions.getReservesList);

    const reservesList = await this.multicall.call(reserveListCall, this.meta.chain);
    const reserveDataCalls = [];

    reservesList.forEach((reserveAddress) => {
      reserveDataCalls.push(
        poolContract.createCall(this.poolFunctions.getReserveData, reserveAddress),
      );
    });

    const reserveData = await this.multicall.callArray(reserveDataCalls, this.meta.chain);

    const reserveTotalSuppliedCalls = [];
    const variableDebtCalls = [];
    const stableDebtCalls = [];

    reserveData.forEach(({ aTokenAddress, stableDebtTokenAddress, variableDebtTokenAddress }) => {
      const aTokenContract = new ERC20(aTokenAddress);
      reserveTotalSuppliedCalls.push(aTokenContract.totalSupply());

      const vTokenContract = new ERC20(variableDebtTokenAddress);
      variableDebtCalls.push(vTokenContract.totalSupply());

      const sTokenContract = new ERC20(stableDebtTokenAddress);
      stableDebtCalls.push(sTokenContract.totalSupply());
    });
    const [aTokenSupply, vTokenSupply, sTokenSupply] = await Promise.all([
      this.multicall.callArray(reserveTotalSuppliedCalls, this.meta.chain),
      this.multicall.callArray(variableDebtCalls, this.meta.chain),
      this.multicall.callArray(stableDebtCalls, this.meta.chain),
    ]);

    return reserveData.map(
      (
        {
          aTokenAddress,
          stableDebtTokenAddress,
          variableDebtTokenAddress,
          currentLiquidityRate,
          currentVariableBorrowRate,
          currentStableBorrowRate,
        },
        index,
      ) => {
        const underlyingAsset = reservesList[index];
        const totalATokenSupply = aTokenSupply[index];
        const totalCurrentVariableDebt = vTokenSupply[index];
        const totalPrincipalStableDebt = sTokenSupply[index];

        const borrowRate = {};
        this.updateBorrowRateField(
          'variableApy',
          currentVariableBorrowRate,
          totalCurrentVariableDebt,
          borrowRate,
        );

        this.updateBorrowRateField(
          'stableApy',
          currentStableBorrowRate,
          totalPrincipalStableDebt,
          borrowRate,
        );

        return {
          feature: this.meta.feature,
          chain: this.meta.chain,
          id: aTokenAddress,
          sTokenAddress: stableDebtTokenAddress,
          vTokenAddress: variableDebtTokenAddress,
          supplied: [
            {
              token: { address: underlyingAsset.toLowerCase() },
              totalSupplied: totalATokenSupply.toString(),
              apy: {
                year: new BigNumber(currentLiquidityRate) //
                  .dividedBy(RAY)
                  .toNumber(),
              },
            },
          ],
          borrowed: [
            {
              token: { address: underlyingAsset.toLowerCase() },
              totalBorrowed: new BigNumber(totalCurrentVariableDebt as any)
                .plus(new BigNumber(totalPrincipalStableDebt as any))
                .toString(),
              apy: borrowRate,
            },
          ],
          rewarded: rewardTokens,
        };
      },
    );
  }

  async initialize() {
    this.poolFunctions = await this.abiService.parseFunctionsFromAddress(
      '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
      ChainIdEnum.eth,
      this.poolFunctionPredicates,
    );

    if (this.meta.incentives) {
      this.incentivesFunctions = await this.abiService.parseFunctionsFromAddress(
        '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5',
        ChainIdEnum.eth,
        this.incentivesFunctionsPredicates,
      );
    }
  }

  protected updateBorrowRateField(field: string, rate: string, debtValue: string, borrowRate: any) {
    if (Number(debtValue) > 0) {
      borrowRate[field] = new BigNumber(rate) //
        .dividedBy(RAY)
        .toNumber();
    }
  }
  protected formatOpportunity(
    opportunity: Aave2LendingFeatureMinimal,
    tokens: TokenMap,
  ): void | AaveLendingFeatureOpportunity {
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      ...opportunity,
    };

    const receipt = this.formatOpportunityReceiptToken(
      opportunity,
      tokens.get(opportunity.id),
      tokens,
    );
    if (receipt) {
      base.token = receipt;
    }

    // fill & format supplied tokens
    if ('supplied' in opportunity) {
      base.supplied = opportunity.supplied.map((poolToken) => {
        const token = tokens.get(poolToken.token.address);
        if (!token) {
          throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
        }

        return this.formatOpportunitySuppliedToken(poolToken, token);
      });
    } else if ('supply' in opportunity) {
      const token = tokens.get((opportunity.supply as any).token.address);
      if (!token) {
        throw new MissingTokenException(
          (opportunity.supply as any).token,
          opportunity,
          this.meta.chain,
        );
      }

      base.supply = this.formatOpportunitySuppliedToken(opportunity.supply, token);
    }

    const tvl = this.getOpportunityTVL(opportunity, tokens);

    // fill & format reward tokens
    if ('rewarded' in opportunity) {
      base.rewarded = opportunity.rewarded.map((poolToken) => {
        const token = tokens.get(poolToken.token.address);
        if (!token) {
          throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
        }

        return this.formatOpportunityRewardedToken(poolToken, token, tvl);
      });
    } else if ('reward' in opportunity) {
      const token = tokens.get((opportunity.reward as any).token.address);
      if (!token) {
        throw new MissingTokenException(
          (opportunity.reward as any).token,
          opportunity,
          this.meta.chain,
        );
      }

      base.reward = this.formatOpportunityRewardedToken(opportunity.reward, token, tvl);
    }

    // fill & format borrowed tokens
    if ('borrowed' in opportunity) {
      base.borrowed = opportunity.borrowed.map((poolToken) => {
        const token = tokens.get(poolToken.token.address);
        if (!token) {
          throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
        }

        return this.formatOpportunityBorrowedToken(poolToken, token);
      });
    } else if ('borrow' in opportunity) {
      const token = tokens.get((opportunity.borrow as any).token.address);
      if (!token) {
        throw new MissingTokenException(
          (opportunity.borrow as any).token,
          opportunity,
          this.meta.chain,
        );
      }

      base.borrow = this.formatOpportunityBorrowedToken(opportunity.borrow, token);
    }

    return base;
  }

  protected formatOpportunitySuppliedToken(
    supplied: any,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, token.decimals);

    return {
      token,
      apy: supplied.apy,
      // eslint-disable-next-line newline-per-chained-call
      tvl: new BigNumber(totalSupplied).multipliedBy(new BigNumber(token.price)).toNumber(),
    };
  }

  protected formatOpportunityBorrowedToken(
    borrowed: any,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalBorrowed = normalizeDecimals(borrowed.totalBorrowed, token.decimals);

    return {
      token,
      apy: borrowed.apy,
      // eslint-disable-next-line newline-per-chained-call
      tvl: new BigNumber(totalBorrowed).multipliedBy(new BigNumber(token.price)).toNumber(),
    };
  }

  async getUsersData(
    addresses: string[],
  ): Promise<{ data: Map<string, ILendingFeatureUserEntry[]>; errors: Error[] }> {
    const { data: pools, errors } = await this.getPoolData();

    const wallets = new Map();

    for (const address of addresses) {
      const aTokenBalanceCalls = [];
      const sTokenBalanceCalls = [];
      const vTokenBalanceCalls = [];

      for (const pool of pools) {
        const aTokenContract = new ERC20(pool.id);
        aTokenBalanceCalls.push(aTokenContract.balanceOf(address));

        const sTokenContract = new ERC20(pool.sTokenAddress);
        sTokenBalanceCalls.push(sTokenContract.balanceOf(address));

        const vTokenContract = new ERC20(pool.vTokenAddress);
        vTokenBalanceCalls.push(vTokenContract.balanceOf(address));
      }

      const aTokenBalances: BigNumber[] = await this.multicall.callArray(
        aTokenBalanceCalls,
        this.meta.chain,
      );
      const sTokenBalances: BigNumber[] = await this.multicall.callArray(
        sTokenBalanceCalls,
        this.meta.chain,
      );
      const vTokenBalances: BigNumber[] = await this.multicall.callArray(
        vTokenBalanceCalls,
        this.meta.chain,
      );

      const suppliedTokens: ISupplyTokenUserEntry[] = [];
      const borrowedTokens: IBorrowTokenUserEntity[] = [];
      const rewardTokens: IRewardTokenUserEntry[] = [];

      const checkClaimableForAddresses = [];

      pools.forEach((pool, ind) => {
        const aTokenBalance = aTokenBalances[ind];
        const sTokenBalance = sTokenBalances[ind];
        const vTokenBalance = vTokenBalances[ind];

        if (aTokenBalance.gt(0)) {
          checkClaimableForAddresses.push(pool.id);
          suppliedTokens.push(this.formatFinalSupplyToken(pool, aTokenBalance));
        }

        if (sTokenBalance.gt(0)) {
          checkClaimableForAddresses.push(pool.sTokenAddress);
          borrowedTokens.push(this.formatFinalBorrowToken(pool, sTokenBalance, 'stableApy'));
        }

        if (vTokenBalance.gt(0)) {
          checkClaimableForAddresses.push(pool.vTokenAddress);
          borrowedTokens.push(this.formatFinalBorrowToken(pool, vTokenBalance, 'variableApy'));
        }
      });

      let claimableBalance: BigNumber;
      if (this.meta.incentives) {
        claimableBalance = await this.getClaimableBalance(checkClaimableForAddresses, address);
      }

      if (claimableBalance?.gt(0)) {
        const rewardToken = pools[0].rewarded[0];
        const normalizedRewardAmount = normalizeDecimals(
          claimableBalance.toString(),
          rewardToken.token.decimals,
        );

        rewardTokens.push({
          ...rewardToken,
          amount: normalizedRewardAmount,
          value: new BigNumber(normalizedRewardAmount)
            .multipliedBy(new BigNumber(rewardToken.token.price))
            .toNumber(),
        });
      }

      const debtRatio = await this.getDebtRatio(address);

      wallets.set(address, [
        {
          feature: FeatureEnum.lending,
          id: 'aave-lending',
          chain: this.meta.chain,
          borrowed: borrowedTokens,
          supplied: suppliedTokens,
          rewarded: rewardTokens,
          debtRatio,
        },
      ]);
    }

    return { data: wallets, errors };
  }
  private async getClaimableBalance(
    assetAddresses: string[],
    userAddress: string,
  ): Promise<BigNumber> {
    const blacklistedRewardAssetAddresses = {
      [ChainIdEnum.eth]: ['0x3356ec1efa75d9d150da1ec7d944d9edf73703b7'],
    };
    const incentivesContract = new DynamicContract(this.meta.incentives);

    return (
      await this.multicall.callArray(
        [
          incentivesContract.createCall(
            this.incentivesFunctions.getRewardsBalance,
            assetAddresses.filter(
              (x) => !blacklistedRewardAssetAddresses[this.meta.chain]?.includes(x.toLowerCase()),
            ),
            userAddress,
          ),
        ],
        this.meta.chain,
      )
    )[0];
  }

  private formatFinalBorrowToken(
    pool: AaveLendingFeatureOpportunity,
    sTokenBalance: BigNumber,
    apyField: 'stableApy' | 'variableApy',
  ): IBorrowTokenUserEntity {
    const borrowedToken = pool.borrowed[0];

    const normalizedBorrowAmount = normalizeDecimals(
      sTokenBalance.toString(),
      borrowedToken.token.decimals,
    );
    const borrowValueBn = new BigNumber(normalizedBorrowAmount).multipliedBy(
      new BigNumber(borrowedToken.token.price),
    );

    return {
      ...borrowedToken,
      apy: { year: borrowedToken.apy[apyField] },
      amount: normalizedBorrowAmount,
      value: borrowValueBn.toNumber(),
    };
  }
  private formatFinalSupplyToken(
    pool: AaveLendingFeatureOpportunity,
    aTokenBalance: BigNumber,
  ): ISupplyTokenUserEntry {
    const suppliedToken = pool.supplied[0];
    const normalizedSupplyAmount = normalizeDecimals(
      aTokenBalance.toString(),
      suppliedToken.token.decimals,
    );
    const supplyValueBn = new BigNumber(normalizedSupplyAmount).multipliedBy(
      new BigNumber(suppliedToken.token.price),
    );

    return {
      ...suppliedToken,
      amount: normalizedSupplyAmount,
      value: supplyValueBn.toNumber(),
    };
  }

  private async getDebtRatio(userAddress: string) {
    let debtRatio = 0;
    const poolContract = new DynamicContract(this.meta.address);

    const { totalCollateralETH, totalDebtETH, healthFactor } = (
      await this.multicall.callArray(
        [poolContract.createCall(this.poolFunctions.getUserAccountData, userAddress)],
        this.meta.chain,
      )
    )[0];

    if (Number(totalCollateralETH.toString()) || Number(totalDebtETH.toString())) {
      const MAX_HEALTH = 100;

      debtRatio = BigNumber.minimum(
        normalizeDecimals(healthFactor.toString(), 18),
        MAX_HEALTH,
      ).toNumber();
    }
    return debtRatio;
  }
}
