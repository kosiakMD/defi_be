import { BigNumber as BN } from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import {
  AaveUser,
  AutomaticMarketMaker,
  Borrowing,
  BorrowingToken,
  Lending,
  LendingToken,
  LiquidityPositionDto,
} from '@app/common';
import {
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
} from '@app/common/dto/liquidity.position.dto';
import { StakingProjectDto, TransactionProjectDto } from '@app/common/dto/transactions.dto';
import { ChainIdEnum, ProjectEnum, ProtocolTypeEnum, UniswapProtocolEnum } from '@app/common/enum';
import { ProtocolName } from '@app/common/types';
import { decimalConverter } from '@app/common/utils/number';

import { Web3Provider } from '../../../chain/web3.provider';
import { LiquidityPool } from '../../../dto/liquidity.position.dto';
import { FeesSn1Data, FeesSn2Data } from '../../../interfaces/fee.interfaces';
import {
  BaseData,
  ERC20Token,
  PoolToken,
  PoolTokenDto,
  UniswapSubgraphLikeData,
} from '../../../interfaces/transactions.interfaces';
import { PriceService } from '../../../price/price.service';
import { abi } from '../../../utils/abi';
import { decimalsDivider } from '../../../utils/util';

type BaseInfo = Omit<BaseData, 'protocolType'>;

@Injectable()
export class Mapper {
  static PERCENTAGE = 50;

  protected static priceInUSD(totalUSD: string, amount: string): number {
    return new BN(totalUSD) //
      .div(2)
      .div(amount)
      .toNumber();
  }

  protected static createPoolTokenPoolBN(pair, order: 0 | 1, userPoolShare: BN): PoolTokenDto {
    const poolToken = Mapper.createPoolToken(pair, order);
    poolToken.amount = userPoolShare.times(poolToken.reserve).toString();
    return poolToken;
  }

  protected static createPoolTokenPoolNumber(
    pair,
    order: 0 | 1,
    userPoolShare: number,
  ): PoolTokenDto {
    const poolToken = Mapper.createPoolToken(pair, order);
    poolToken.amount = (userPoolShare * Number(poolToken.reserve)).toString();
    return poolToken;
  }

  protected static createPoolToken(pair, order: 0 | 1): PoolTokenDto {
    const token = pair[`token${order}`];
    const reserve = pair[`reserve${order}`];
    const poolToken = plainToClass(PoolTokenDto, {});
    poolToken.address = token.id;
    poolToken.decimals = Number(token.decimals);
    poolToken.name = token.name;
    poolToken.symbol = token.symbol;
    poolToken.totalSupply = null;
    poolToken.reserve = reserve;
    poolToken.priceUSD = Mapper.priceInUSD(pair.reserveUSD, reserve);
    poolToken.percentage = Mapper.PERCENTAGE;

    return poolToken;
  }

  protected static createBaseData(baseInfo: BaseInfo, protocolType: ProtocolTypeEnum): BaseData {
    return {
      protocolType,
      chainId: baseInfo.chainId,
      protocolName: baseInfo.protocolName,
      projectName: baseInfo.projectName,
      userAddress: baseInfo.userAddress,
    };
  }

  protected static createDynamicFeature<T>(baseInfo: BaseInfo, protocolType: ProtocolTypeEnum): T {
    const typeInfo = {
      [ProtocolTypeEnum.transaction]: {
        field: 'txs',
        dto: TransactionProjectDto as any, // TODO: fix
      },
      [ProtocolTypeEnum.amm]: {
        field: 'liquidityPositions',
        dto: AutomaticMarketMaker,
      },
      [ProtocolTypeEnum.staking]: {
        field: 'staking',
        dto: StakingProjectDto,
      },
      [ProtocolTypeEnum.lending]: {
        field: 'lendingPositions',
        dto: Lending,
      },
      [ProtocolTypeEnum.borrowing]: {
        field: 'borrowingPositions',
        dto: Borrowing,
      },
    };
    return plainToClass(
      typeInfo[protocolType].dto,
      Object.assign(Mapper.createBaseData(baseInfo, protocolType), {
        [typeInfo[protocolType].field]: [],
      }),
    );
  }

  protected static transformTransaction(baseInfo: BaseInfo): TransactionProjectDto {
    return Mapper.createDynamicFeature<TransactionProjectDto>(
      baseInfo,
      ProtocolTypeEnum.transaction,
    );
  }

  protected static transformAmm(baseInfo: BaseInfo): AutomaticMarketMaker {
    return Mapper.createDynamicFeature<AutomaticMarketMaker>(baseInfo, ProtocolTypeEnum.amm);
  }

  protected static transformStaking(baseInfo: BaseInfo): StakingProjectDto {
    return Mapper.createDynamicFeature<StakingProjectDto>(baseInfo, ProtocolTypeEnum.staking);
  }

  protected static transformLending(baseInfo: BaseInfo): Lending {
    return Mapper.createDynamicFeature<Lending>(baseInfo, ProtocolTypeEnum.lending);
  }

  protected static transformBorrowing(baseInfo: BaseInfo): Borrowing {
    return Mapper.createDynamicFeature<Borrowing>(baseInfo, ProtocolTypeEnum.borrowing);
  }

  constructor(
    private readonly chainProvider: Web3Provider,
    private readonly priceService: PriceService,
  ) {}

  public async mapData(
    userAddresses: string[],
    originAddresses: string[],
    subgraphData: UniswapSubgraphLikeData,
    projectName: ProjectEnum,
    protocolName: ProtocolName,
    chainId: ChainIdEnum,
  ): Promise<BaseData[]> {
    const base: BaseData[] = [];

    for (const userAddress of originAddresses) {
      const baseInfo: BaseInfo = {
        chainId,
        projectName,
        protocolName,
        userAddress: Mapper.getOriginAddress(originAddresses, userAddress),
      };
      // const transactions: TransactionProjectDto = Mapper.transformTransaction(baseInfo);
      // base.push(transactions);

      if (subgraphData.subgraphPools) {
        const amm: AutomaticMarketMaker = Mapper.transformAmm(baseInfo);
        Mapper.mapLiquidityPositions(
          amm,
          !subgraphData.subgraphPools.get(userAddress)
            ? []
            : subgraphData.subgraphPools.get(userAddress),
        );
        base.push(amm);
      }

      if (subgraphData.subgraphStaking) {
        const staking: StakingProjectDto = Mapper.transformStaking(baseInfo);

        await this.mapStakingPositions(
          staking,
          !subgraphData.subgraphPools.has(userAddress)
            ? []
            : subgraphData.subgraphPools.get(userAddress),
          !subgraphData.subgraphStaking.has(userAddress)
            ? []
            : subgraphData.subgraphStaking.get(userAddress),
        );

        base.push(staking);
      }

      if (subgraphData.subgraphLending) {
        // TODO: Lending should be a class and use plainToClass
        const lending: Lending = Mapper.transformLending(baseInfo);

        const borrowing: Borrowing = Mapper.transformBorrowing(baseInfo);

        await this.mapLendingPositions(
          lending,
          borrowing,
          subgraphData.subgraphLending.get(userAddress),
        );
        base.push(lending);
        base.push(borrowing);
      }
    }
    return base;
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

  private static mapLiquidityPositions(
    amm: AutomaticMarketMaker,
    subgraphPools: IncomeLiquidityPosition[],
  ): void {
    for (const subgraphPool of subgraphPools) {
      const pool: LiquidityPool = plainToClass(LiquidityPool, {
        address: subgraphPool.pair.id,
        name: null,
      });
      const lpToken: ERC20Token = plainToClass(ERC20Token, {
        address: subgraphPool.pair.id,
        decimals: 18, // always 18 in Uniswap
        name: null,
        symbol: null,
        totalSupply: subgraphPool.pair.totalSupply,
      });

      const { pair } = subgraphPool;

      const userPoolShare = Number(subgraphPool.liquidityTokenBalance) / Number(pair.totalSupply);

      const [poolToken0, poolToken1] = Mapper.mapFromProjectTokenToPoolToken(pair, userPoolShare);

      const project =
        amm.projectName === ProjectEnum.uniswap ? UniswapProtocolEnum.uniswapV2 : amm.projectName;
      const liquidityPosition: LiquidityPositionDto = plainToClass(LiquidityPositionDto, {
        pool: pool,
        lpToken,
        lpTokenBalance: subgraphPool.liquidityTokenBalance,
        project: project,
        poolTokens: [poolToken0, poolToken1],
        earnedFeeUSD: 0,
        exitedAt: null,
      });

      amm.liquidityPositions.push(liquidityPosition);
    }
  }

  private static mapFromProjectTokenToPoolToken(
    pair: IncomeLiquidityPositionPair,
    userPoolShare: number,
  ): PoolToken[] {
    const poolToken0 = Mapper.createPoolTokenPoolNumber(pair, 0, userPoolShare);
    const poolToken1 = Mapper.createPoolTokenPoolNumber(pair, 1, userPoolShare);

    return [poolToken0, poolToken1];
  }

  private static getOriginAddress(originArray: string[], address: string): string {
    return originArray.find((origin) => origin.toLowerCase() === address);
  }

  protected async mapStakingPositions(
    staking: StakingProjectDto,
    liquidityPositions: IncomeLiquidityPosition[],
    stakingPositions,
  ): Promise<void> {
    const StakingPositionsToPush = [];
    const address = '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2';

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
            // priceUSD: usdPriceOfRewardToken.prices[address],
            priceUSD: null,
          },
          exitedAt: null,
          liquidityPoolTokens: [],
        };

        liquidityPositions.forEach((element1) => {
          if (element1.pair.id === element.pool.pair) {
            const { pair } = element1;
            lpToken.address = pair.id;
            lpToken.totalSupply = pair.totalSupply;
            //
            const userPoolShare = new BN(position.staked).div(element1.pair.totalSupply);
            const poolToken0 = Mapper.createPoolTokenPoolBN(pair, 0, userPoolShare);
            const poolToken1 = Mapper.createPoolTokenPoolBN(pair, 1, userPoolShare);
            //
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
      const getReserveDecimals = decimalConverter(userReserve.reserve.decimals);

      // Calculate Lending
      if (Number(userReserve.currentATokenBalance)) {
        const lendingToken: LendingToken = plainToClass(LendingToken, {
          address: userReserve.reserve.underlyingAsset,
          decimals: userReserve.reserve.decimals,
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          priceUSD: userReserve.reserve.priceUSD,
        });

        const totalDepositDecimal = getReserveDecimals(Number(userReserve.currentATokenBalance));

        lending.lendingPositions.push({
          address: userReserve.reserve.id,
          totalDeposit: userReserve.currentATokenBalance,
          totalDepositDecimal,
          totalDepositUSD: totalDepositDecimal * lendingToken.priceUSD,
          lendingAPY: 100 * (Number(userReserve.reserve.liquidityRate) / RAY),
          token: lendingToken,
        });
      }

      // Calculate Borrowing
      if (Number(userReserve.currentTotalDebt)) {
        const borrowToken: BorrowingToken = plainToClass(BorrowingToken, {
          address: userReserve.reserve.underlyingAsset,
          decimals: userReserve.reserve.decimals,
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          priceUSD: userReserve.reserve.priceUSD,
        });

        const totalDebtDecimal = getReserveDecimals(Number(userReserve.currentTotalDebt));
        const stableDebtDecimal = getReserveDecimals(Number(userReserve.currentStableDebt));
        const variableDebtDecimal = getReserveDecimals(Number(userReserve.currentVariableDebt));

        borrowing.borrowingPositions.push({
          address: userReserve.reserve.id,
          totalDebt: userReserve.currentTotalDebt,
          stableDebt: userReserve.currentStableDebt,
          variableDebt: userReserve.currentVariableDebt,
          totalDebtDecimal,
          stableDebtDecimal,
          variableDebtDecimal,
          totalDebtUSD: totalDebtDecimal * borrowToken.priceUSD,
          stableDebtUSD: stableDebtDecimal * borrowToken.priceUSD,
          variableDebtUSD: variableDebtDecimal * borrowToken.priceUSD,
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
