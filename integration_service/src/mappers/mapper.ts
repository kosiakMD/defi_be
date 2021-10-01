import { BigNumber as BN } from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { Borrowing, Lending } from 'src/interfaces/lending.position.interfaces';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import {
  ChainIdEnum,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolName,
  ProtocolTypeEnum,
  SpookySwapProtocolEnum,
  UniswapProtocolEnum,
} from 'src/common/enum';

import { Web3Provider } from '../chain/web3.provider';
import {
  AaveUser,
  LiquidityPool,
  LiquidityPosition,
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
} from '../dto/liquidity.position.dto';
import { IncomeToken } from '../interfaces/entity.information.interfaces';
import { FeesSn1Data, FeesSn2Data } from '../interfaces/fee.interfaces';
import { Staking } from '../interfaces/staking.position.interfaces';
import {
  AutomaticMarketMaker,
  BaseData,
  BorrowingDto,
  ERC20Token,
  LendingDto,
  LendingErcToken,
  PoolToken,
  PoolTokenDto,
  Transactions,
  UniswapResponseData,
} from '../interfaces/transactions.interfaces';
import { PriceService } from '../price/price.service';
import { abi, decimalsDivider } from '../utils/util';

@Injectable()
export class Mapper {
  static PERCENTAGE = 50;

  constructor(
    private readonly chainProvider: Web3Provider,
    private readonly priceService: PriceService,
  ) {}

  public async mapData(
    userAddresses: string[],
    originAddresses: string[],
    response: UniswapResponseData,
    projectName: ProjectEnum,
    protocolName?: ProtocolName,
    chain?: ChainIdEnum,
  ): Promise<BaseData[]> {
    const base: BaseData[] = [];

    // TODO: add checks does protocol belong to chain
    const chainId = chain ?? Mapper.guessChainIdFromProtocolName(protocolName);

    for (const address of userAddresses) {
      const transactions: Transactions = plainToClass(Transactions, {
        chainId: chainId,
        protocolType: ProtocolTypeEnum.transaction,
        protocolName: protocolName,
        platformName: projectName,
        userAddress: Mapper.getOriginAddress(originAddresses, address),
        txs: [],
      });

      const amm: AutomaticMarketMaker = plainToClass(AutomaticMarketMaker, {
        chainId: chainId,
        protocolType: ProtocolTypeEnum.amm,
        protocolName: protocolName,
        platformName: projectName,
        userAddress: Mapper.getOriginAddress(originAddresses, address),
        liquidityPositions: [],
      });

      if (response.sushiswapStakingPosition) {
        const staking: Staking = {
          chainId: chainId,
          protocolType: ProtocolTypeEnum.staking,
          protocolName: protocolName,
          projectName: projectName,
          userAddress: Mapper.getOriginAddress(originAddresses, address),
          stakingPositions: [],
        };

        await this.mapStakingPositions(
          staking,
          !response.uniswapLiquidityPositions.get(address)
            ? []
            : response.uniswapLiquidityPositions.get(address),
          !response.sushiswapStakingPosition.get(address)
            ? []
            : response.sushiswapStakingPosition.get(address),
        );

        base.push(staking);
      }

      if (response.aaveLendingPositions) {
        // TODO: Lending should be a class and use plainToClass
        const lending: LendingDto = plainToClass(LendingDto, {
          chainId: chainId,
          protocolType: ProtocolTypeEnum.lending,
          protocolName: protocolName,
          platformName: projectName,
          userAddress: Mapper.getOriginAddress(originAddresses, address),
          lendingPositions: [],
        });

        const borrowing: Borrowing = plainToClass(BorrowingDto, {
          chainId: chainId,
          protocolType: ProtocolTypeEnum.borrowing,
          protocolName: protocolName,
          platformName: projectName,
          userAddress: Mapper.getOriginAddress(originAddresses, address),
          borrowingPositions: [],
        });

        await this.mapLendingPositions(
          lending,
          borrowing,
          response.aaveLendingPositions.get(address),
        );
        base.push(lending);
        base.push(borrowing);
      }

      this.mapLiquidityPositions(
        amm,
        !response.uniswapLiquidityPositions.get(address)
          ? []
          : response.uniswapLiquidityPositions.get(address),
      );

      base.push(amm);
      base.push(transactions);
    }

    return base;
  }

  private static guessChainIdFromProtocolName(name: ProtocolName): ChainIdEnum {
    switch (name) {
      case PancakeProtocolEnum.pancakeV1:
        return ChainIdEnum.bsc;
      case SpookySwapProtocolEnum.SpookySwap:
        return ChainIdEnum.ftm;
      default:
        return ChainIdEnum.eth;
    }
  }

  static priceInUSD(totalUSD: string, amount: string): number {
    return new BN(totalUSD) //
      .div(2)
      .div(amount)
      .toNumber();
  }

  private static getFeeBetweenTwoSnapshots(sn1: FeesSn1Data, sn2: FeesSn2Data): number {
    if (sn2.tokenSupply === 0 || sn1.tokenSupply === 0) {
      return 0;
    }
    const k1 = sn1.reserve0 * sn1.reserve1;
    const k2 = sn2.reserve0 * sn2.reserve1;

    const fee = 1 - Math.sqrt(k1) / Math.sqrt(k2);
    const share1 = sn1.tokenBalance / sn1.tokenSupply;
    const supplyChange = sn1.tokenSupply / sn2.tokenSupply - 1;

    const lpChange = sn2.tokenSupply * supplyChange;
    const lpFee = sn2.tokenSupply * fee;
    const lpFeeEarned = lpChange + lpFee;

    // this is how much fees earned by user
    // can be used to calculate USD fees
    // and fees in each token as well
    const lpEarnedUser = lpFeeEarned * share1;

    // we make calculation only in USD for now
    const lpTokenPrice = sn2.totalReserve / sn2.tokenSupply;
    return lpEarnedUser * lpTokenPrice;
  }

  public mapLiquidityPositions(
    amm: AutomaticMarketMaker,
    liquidityPositions: IncomeLiquidityPosition[],
  ): void {
    liquidityPositions.forEach((lp) => {
      // for (const lp of liquidityPositions) {
      // pool
      const pool: LiquidityPool = plainToClass(LiquidityPool, {});
      pool.address = lp.pair.id;
      pool.name = null;
      // lpToken
      const lpToken: ERC20Token = plainToClass(ERC20Token, {});
      lpToken.address = lp.pair.id;
      lpToken.decimals = 18; // always 18 in Uniswap
      lpToken.name = null;
      lpToken.symbol = null;
      lpToken.totalSupply = lp.pair.totalSupply;
      //
      const { pair } = lp;
      const { token0, token1 } = pair;
      //
      const userPoolShare = Number(lp.liquidityTokenBalance) / Number(pair.totalSupply);
      //
      const poolTokens /*[poolToken0, poolToken1]*/ = Mapper.mapFromProjectTokenToPoolToken(
        token0,
        token1,
        lp.pair,
        userPoolShare,
      );

      const project =
        amm.projectName === ProjectEnum.uniswap ? UniswapProtocolEnum.uniswapV2 : amm.projectName;
      // liquidityPositionliquidityPosition
      const liquidityPosition: LiquidityPosition = plainToClass(LiquidityPosition, {});
      liquidityPosition.pool = pool;
      liquidityPosition.lpToken = lpToken;
      liquidityPosition.lpTokenBalance = lp.liquidityTokenBalance;
      liquidityPosition.project = project;
      liquidityPosition.poolTokens = poolTokens; // [poolToken0, poolToken1];
      liquidityPosition.earnedFeeUSD = 0;
      liquidityPosition.exitedAt = null;

      amm.liquidityPositions.push(liquidityPosition);
      // }
    });
  }

  private static makeToken(token: IncomeToken, order: 0 | 1, pair?, userPoolShare?: number) {
    const reserveOrder = `reserve${order}`;
    // poolToken
    const poolToken = plainToClass(PoolTokenDto, {});
    poolToken.address = token.id;
    poolToken.decimals = Number(token.decimals);
    poolToken.name = token.name;
    poolToken.symbol = token.symbol;
    poolToken.totalSupply = null;
    poolToken.reserve = pair && pair[reserveOrder];
    poolToken.amount = (userPoolShare * Number(pair[reserveOrder])).toString();
    poolToken.priceUSD = pair && Mapper.priceInUSD(pair.reserveUSD, pair[reserveOrder]);
    poolToken.percentage = Mapper.PERCENTAGE;
    //
    return poolToken;
  }

  private static mapFromProjectTokenToPoolToken(
    token0: IncomeToken,
    token1: IncomeToken,
    pair?: IncomeLiquidityPositionPair,
    userPoolShare?: number,
  ): PoolToken[] {
    const poolToken0 = Mapper.makeToken(token0, 0, pair, userPoolShare);
    const poolToken1 = Mapper.makeToken(token1, 1, pair, userPoolShare);

    return [poolToken0, poolToken1];
  }

  static getOriginAddress(originArray: string[], address: string): string {
    return originArray.find((origin) => origin.toLowerCase() === address);
  }

  protected async mapStakingPositions(
    staking: Staking,
    liquidityPositions: IncomeLiquidityPosition[],
    stakingPositions,
  ): Promise<void> {
    const StakingPositionsToPush = [];
    const address = '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2';
    const usdPriceOfRewardToken = await this.priceService.getTokenPrices([address], 1);

    for (const element of stakingPositions) {
      if (element.pool) {
        const lpToken = {
          address: '',
          name: null,
          symbol: null,
          decimals: 18,
          totalSupply: '',
        };

        const index = element.id.indexOf('0x');

        const splitted = element.id.split('-');
        const poolId = splitted[0];

        const position = {
          address: element.id.slice(index),
          staked: new BN(element.amount) //
            .div(decimalsDivider(18))
            .toString(),
          lpToken: lpToken,
          rewardToken: {
            address: address,
            name: 'SushiToken',
            symbol: 'SUSHI',
            decimals: 18,
            totalSupply: null,
            claimable: new BN(await this.getPendingSushi(poolId, staking.userAddress)) //
              .div(decimalsDivider(18))
              .toNumber(),
            priceUSD: usdPriceOfRewardToken.prices[address],
          },
          exitedAt: null,
          liquidityPoolTokens: [],
        };

        liquidityPositions.forEach((element1) => {
          if (element1.pair.id === element.pool.pair) {
            lpToken.address = element1.pair.id;
            lpToken.totalSupply = element1.pair.totalSupply;

            const userPoolShare = new BN(position.staked).div(element1.pair.totalSupply);

            const token0 = element1.pair.token0;
            const token1 = element1.pair.token1;
            const reserve0 = element1.pair.reserve0;
            const reserve1 = element1.pair.reserve1;

            const poolToken0 = plainToClass(PoolTokenDto, {
              address: token0.id,
              decimals: Number(token0.decimals),
              name: token0.name,
              symbol: token0.symbol,
              totalSupply: null,
              amount: userPoolShare.times(reserve0).toString(),
              reserve: reserve0,
              priceUSD: Mapper.priceInUSD(element1.pair.reserveUSD, reserve0),
              percentage: Mapper.PERCENTAGE,
            });

            const poolToken1 = plainToClass(PoolTokenDto, {
              address: token1.id,
              decimals: Number(token1.decimals),
              name: token1.name,
              symbol: token1.symbol,
              totalSupply: null,
              amount: userPoolShare.times(reserve1).toString(),
              reserve: reserve1,
              priceUSD: Mapper.priceInUSD(element1.pair.reserveUSD, reserve1),
              percentage: Mapper.PERCENTAGE,
            });
            position.liquidityPoolTokens.push(poolToken0, poolToken1);
          }
        });

        if (position.liquidityPoolTokens && position.liquidityPoolTokens.length) {
          StakingPositionsToPush.push(position);
        }
      } else {
        StakingPositionsToPush.push(element);
      }
    }
    staking.stakingPositions.push(...StakingPositionsToPush);
  }

  protected async mapLendingPositions(
    lending: Lending,
    borrowing: Borrowing,
    user: AaveUser = null,
  ): Promise<void> {
    if (!user) return;

    const RAY = 10 ** 27;

    user.reserves.forEach((userReserve) => {
      // Calculate Lending
      if (Number(userReserve.currentATokenBalance)) {
        const lendingToken: LendingErcToken = plainToClass(LendingErcToken, {
          address: userReserve.reserve.underlyingAsset,
          decimals: userReserve.reserve.decimals,
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          price: userReserve.reserve.priceUSD,
        });

        const totalDepositDecimal =
          Number(userReserve.currentATokenBalance) / 10 ** userReserve.reserve.decimals;

        lending.lendingPositions.push({
          address: userReserve.reserve.id,
          totalDeposit: userReserve.currentATokenBalance,
          balance: totalDepositDecimal,
          value: totalDepositDecimal * lendingToken.price,
          APY: 100 * (Number(userReserve.reserve.liquidityRate) / RAY),
          token: lendingToken,
        });
      }

      // Calculate Borrowing
      if (Number(userReserve.currentTotalDebt)) {
        const borrowToken: LendingErcToken = plainToClass(LendingErcToken, {
          address: userReserve.reserve.underlyingAsset,
          decimals: userReserve.reserve.decimals,
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          price: userReserve.reserve.priceUSD,
        });

        const totalDebtDecimal =
          Number(userReserve.currentTotalDebt) / 10 ** userReserve.reserve.decimals;
        const stableDebtDecimal =
          Number(userReserve.currentStableDebt) / 10 ** userReserve.reserve.decimals;
        const variableDebtDecimal =
          Number(userReserve.currentVariableDebt) / 10 ** userReserve.reserve.decimals;
        borrowing.borrowingPositions.push({
          address: userReserve.reserve.id,
          totalDebt: userReserve.currentTotalDebt,
          stableDebt: userReserve.currentStableDebt,
          variableDebt: userReserve.currentVariableDebt,
          totalDebtDecimal,
          stableDebtDecimal,
          variableDebtDecimal,
          totalDebtUSD: totalDebtDecimal * borrowToken.price,
          stableDebtUSD: stableDebtDecimal * borrowToken.price,
          variableDebtUSD: variableDebtDecimal * borrowToken.price,
          borrowStableAPY: 100 * (Number(userReserve.reserve.stableBorrowRate) / RAY),
          borrowVariableAPY: 100 * (Number(userReserve.reserve.variableBorrowRate) / RAY),
          token: borrowToken,
        });
      }
    });
  }

  private async getPendingSushi(poolId, userId): Promise<string> {
    const masterChiefAddress = '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd';
    const provider = this.chainProvider.instanceEth();
    const contract = await new provider.eth.Contract(abi as AbiItem[], masterChiefAddress);
    return await contract.methods.pendingSushi(poolId, userId).call();
  }
}
