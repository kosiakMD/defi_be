import { BigNumber as BN } from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import { LiquidityPositionDto, AutomaticMarketMaker } from '@app/common';
import {
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
} from '@app/common/dto/liquidity.position.dto';
import {
  ChainIdEnum,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  SpookySwapProtocolEnum,
  UniswapProtocolEnum,
} from '@app/common/enum';
import { ProtocolName } from '@app/common/types';

import { Web3Provider } from '../chain/web3.provider';
import { LiquidityPool } from '../dto/liquidity.position.dto';
import { UniswapToken } from '../interfaces/entity.information.interfaces';
import { FeesSn1Data, FeesSn2Data } from '../interfaces/fee.interfaces';
import { Staking } from '../interfaces/staking.position.interfaces';
import {
  BaseData,
  ERC20Token,
  PoolToken,
  PoolTokenDto,
  Transactions,
  UniswapResponseData,
} from '../interfaces/transactions.interfaces';
import { PriceService } from '../price/price.service';
import { abi } from '../utils/abi';
import { decimalsDivider } from '../utils/util';

@Injectable()
export class Mapper {
  private PERCENTAGE = 50;

  constructor(
    private readonly chainProvider: Web3Provider,
    private readonly priceService: PriceService,
  ) {}

  public async mapData(
    userAddresses: string[],
    originAddresses: string[],
    response: UniswapResponseData,
    platformName: ProjectEnum,
    protocolName?: ProtocolName,
  ): Promise<BaseData[]> {
    const base: BaseData[] = [];

    // TODO: add checks does protocol belong to chain
    const chainId = this.guessChainIdFromProtocolName(protocolName);

    for (const address of userAddresses) {
      const transactions: Transactions = plainToClass(Transactions, {
        chainId: chainId,
        protocolType: ProtocolTypeEnum.transaction,
        protocolName: protocolName,
        platformName: platformName,
        userAddress: this.getOriginAddress(originAddresses, address),
        txs: [],
      });

      const amm: AutomaticMarketMaker = plainToClass(AutomaticMarketMaker, {
        chainId: chainId,
        protocolType: ProtocolTypeEnum.amm,
        protocolName: protocolName,
        platformName: platformName,
        userAddress: this.getOriginAddress(originAddresses, address),
        liquidityPositions: [],
      });

      if (response.sushiswapStakingPosition) {
        const staking: Staking = {
          chainId: chainId,
          protocolType: ProtocolTypeEnum.staking,
          protocolName: protocolName,
          platformName: platformName,
          userAddress: this.getOriginAddress(originAddresses, address),
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

  private guessChainIdFromProtocolName(name: ProtocolName): ChainIdEnum {
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

  private mapLiquidityPositions(
    amm: AutomaticMarketMaker,
    uniswapPositions: IncomeLiquidityPosition[],
  ): void {
    for (const uniswapPosition of uniswapPositions) {
      const pool: LiquidityPool = plainToClass(LiquidityPool, {
        address: uniswapPosition.pair.id,
        name: null,
      });
      const lpToken: ERC20Token = plainToClass(ERC20Token, {
        address: uniswapPosition.pair.id,
        decimals: 18, // always 18 in Uniswap
        name: null,
        symbol: null,
        totalSupply: uniswapPosition.pair.totalSupply,
      });

      const { pair } = uniswapPosition;
      const { token0, token1 } = pair;

      const userPoolShare =
        Number(uniswapPosition.liquidityTokenBalance) / Number(pair.totalSupply);

      const [poolToken0, poolToken1] = this.mapFromUniswapTokenToPoolToken(
        token0,
        token1,
        uniswapPosition.pair,
        userPoolShare,
      );

      const project =
        amm.platformName === ProjectEnum.uniswap ? UniswapProtocolEnum.uniswapV2 : amm.platformName;
      const liquidityPosition: LiquidityPositionDto = plainToClass(LiquidityPositionDto, {
        pool: pool,
        lpToken,
        lpTokenBalance: uniswapPosition.liquidityTokenBalance,
        project: project,
        poolTokens: [poolToken0, poolToken1],
        earnedFeeUSD: 0,
        exitedAt: null,
      });

      amm.liquidityPositions.push(liquidityPosition);
    }
  }

  private mapFromUniswapTokenToPoolToken(
    token0: UniswapToken,
    token1: UniswapToken,
    pair?: IncomeLiquidityPositionPair,
    userPoolShare?: number,
  ): PoolToken[] {
    const poolToken0 = plainToClass(PoolTokenDto, {
      address: token0.id,
      decimals: Number(token0.decimals),
      name: token0.name,
      symbol: token0.symbol,
      totalSupply: null,
      reserve: pair && pair.reserve0,
      amount: (userPoolShare * Number(pair.reserve0)).toString(),
      priceUSD: pair && Mapper.priceInUSD(pair.reserveUSD, pair.reserve0),
      percentage: this.PERCENTAGE,
    });

    const poolToken1 = plainToClass(PoolTokenDto, {
      address: token1.id,
      decimals: Number(token1.decimals),
      name: token1.name,
      symbol: token1.symbol,
      totalSupply: null,
      reserve: pair && pair.reserve1,
      amount: (userPoolShare * Number(pair.reserve1)).toString(),
      priceUSD: pair && Mapper.priceInUSD(pair.reserveUSD, pair.reserve1),
      percentage: this.PERCENTAGE,
    });

    return [poolToken0, poolToken1];
  }

  private getOriginAddress(originArray: string[], address: string): string {
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
              percentage: this.PERCENTAGE,
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
              percentage: this.PERCENTAGE,
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

  private async getPendingSushi(poolId, userId): Promise<string> {
    const masterChiefAddress = '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd';
    const provider = this.chainProvider.instanceEth();
    const contract = await new provider.eth.Contract(abi as AbiItem[], masterChiefAddress);
    return await contract.methods.pendingSushi(poolId, userId).call();
  }
}
