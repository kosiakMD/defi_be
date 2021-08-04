import { Injectable } from '@nestjs/common';
import { BigNumber as BN } from 'bignumber.js';
import { LiquidityChangeTypeEnum, ProtocolTypeEnum, TransactionTypeEnum } from 'src/common/enum';
import { AbiItem } from 'web3-utils';

import { Web3Provider } from '../chain/web3.provider';
import {
  BurnsInterface,
  MintsInterface,
  SnapshotsInterface,
  SwapsInterface,
  UniswapToken,
} from '../interfaces/entity.information.interfaces';
import { FeesSn1Data, FeesSn2Data } from '../interfaces/fee.interfaces';
import {
  LiquidityPool,
  LiquidityPosition,
  UniswapLiquidityPosition,
  UniswapLiquidityPositionPair,
} from '../interfaces/liquidity.position.interfaces';
import { Staking } from '../interfaces/staking.position.interfaces';
import {
  AutomaticMarketMaker,
  Base,
  ERC20Token,
  LiquidityChangeTransaction,
  PoolToken,
  SwapToken,
  SwapTransaction,
  Transactions,
  UniswapResponseData,
} from '../interfaces/transactions.interfaces';
import { PROJECT_PANCAKE } from '../pools/pools.setting';
import { PriceService } from '../price/price.service';
import { abi, decimalsDivider } from '../utils/util';

@Injectable()
export class Mapper {
  private PERSENTAGE = 50;

  constructor(
    private readonly chainProvider: Web3Provider,
    private readonly priceService: PriceService,
  ) {}

  public async mapData(
    userAddresses: string[],
    originAddresses: string[],
    response: UniswapResponseData,
    protocolName: string,
  ): Promise<Base[]> {
    const base: Base[] = [];

    const chainId = protocolName === PROJECT_PANCAKE ? 2 : 1;
    for (const address of userAddresses) {
      const transactions: Transactions = {
        chainId: chainId,
        protocolType: ProtocolTypeEnum.transaction,
        protocolName: protocolName,
        userAddress: this.getOriginAddress(originAddresses, address),
        txs: [],
      };

      const amm: AutomaticMarketMaker = {
        chainId: chainId,
        protocolType: ProtocolTypeEnum.amm,
        protocolName: protocolName,
        userAddress: this.getOriginAddress(originAddresses, address),
        liquidityPositions: [],
      };

      if (response.sushiswapStakingPosition) {
        const staking: Staking = {
          chainId: chainId,
          protocolType: ProtocolTypeEnum.staking,
          protocolName: protocolName,
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
      this.mapLiquidityLiquiditySnapshots(
        amm,
        !response.uniswapSnapshots.get(address) ? [] : response.uniswapSnapshots.get(address),
        !response.uniswapLiquidityPositions.get(address)
          ? []
          : response.uniswapLiquidityPositions.get(address),
      );
      this.mapMints(
        transactions,
        !response.uniswapMints.get(address) ? [] : response.uniswapMints.get(address),
      );
      this.mapBurns(
        transactions,
        !response.uniswapBurns.get(address) ? [] : response.uniswapBurns.get(address),
      );
      this.mapSwaps(
        transactions,
        !response.uniswapSwapsFrom.get(address) ? [] : response.uniswapSwapsFrom.get(address),
      );

      base.push(amm);
      base.push(transactions);
    }
    return base;
  }

  private mapMints(transactions: Transactions, mints: MintsInterface[]): void {
    for (const mint of mints) {
      const { token0, token1 } = mint.information.pair;
      const [poolToken0, poolToken1] = this.mapFromUniswapTokenToPoolToken(token0, token1, mint);

      const ammMint: LiquidityChangeTransaction = this.createLiquidityChangeTransaction(
        mint,
        [poolToken0, poolToken1],
        true,
      );

      transactions.txs.push(ammMint);
    }
  }

  private mapBurns(transactions: Transactions, burns: BurnsInterface[]): void {
    for (const burn of burns) {
      const { token0, token1 } = burn.information.pair;

      const [poolToken0, poolToken1] = this.mapFromUniswapTokenToPoolToken(token0, token1, burn);

      const ammBurn: LiquidityChangeTransaction = this.createLiquidityChangeTransaction(
        burn,
        [poolToken0, poolToken1],
        false,
      );

      transactions.txs.push(ammBurn);
    }
  }

  private mapSwaps(transactions: Transactions, swapFrom: SwapsInterface[]): void {
    for (const swap of swapFrom) {
      const ammSwap: SwapTransaction = {
        type: TransactionTypeEnum.swap,
        hash: swap.information.transaction.id,
        timestamp: Number(swap.information.transaction.timestamp),
        blockNumber: Number(swap.blockNumber),
        gasPrice: null,
        gasPriceUsd: null,
        gasUsed: null,
        tokenIn: null,
        tokenOut: null,
      };

      const token0: SwapToken = {
        address: swap.information.pair.token0.id,
        name: swap.information.pair.token0.name,
        symbol: swap.information.pair.token0.symbol,
        decimals: Number(swap.information.pair.token0.decimals),
        totalSupply: null,
      };

      const token1: SwapToken = {
        address: swap.information.pair.token1.id,
        name: swap.information.pair.token1.name,
        symbol: swap.information.pair.token1.symbol,
        decimals: Number(swap.information.pair.token1.decimals),
        totalSupply: null,
      };

      // check which token is "IN"
      // this means that token0 is "IN"
      if (swap.information.amount0In !== '0') {
        ammSwap.tokenIn = token0;
        ammSwap.tokenIn.amount = swap.information.amount0In;
        ammSwap.tokenIn.priceUSD =
          Number(swap.information.amountUSD) / Number(swap.information.amount0In);
        ammSwap.tokenOut = token1;
        ammSwap.tokenOut.amount = swap.information.amount1Out;
        ammSwap.tokenOut.priceUSD =
          Number(swap.information.amountUSD) / Number(swap.information.amount1Out);
      } else {
        ammSwap.tokenIn = token1;
        ammSwap.tokenIn.amount = swap.information.amount1In;
        ammSwap.tokenIn.priceUSD =
          Number(swap.information.amountUSD) / Number(swap.information.amount1In);
        ammSwap.tokenOut = token0;
        ammSwap.tokenOut.amount = swap.information.amount0Out;
        ammSwap.tokenOut.priceUSD =
          Number(swap.information.amountUSD) / Number(swap.information.amount0Out);
      }

      // handle swap with more then 1 pair i such way
      const existedSwap = transactions.txs.find(
        (t) => t.type === 'swap' && t.hash === swap.information.transaction.id,
      ) as SwapTransaction;
      if (existedSwap) {
        // can be used logIndex here, but as subgraph returns data in the same order this works too
        if (ammSwap.tokenIn.address === existedSwap.tokenOut.address) {
          existedSwap.tokenOut = ammSwap.tokenOut;
        }
      } else {
        transactions.txs.push(ammSwap);
      }
    }
  }

  priceInUSD(totalUSD: string, amount: string): number {
    return new BN(totalUSD) //
      .div(2)
      .div(amount)
      .toNumber();
  }

  private getFeeBetweenTwoSnapshots(sn1: FeesSn1Data, sn2: FeesSn2Data): number {
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

  private mapLiquidityLiquiditySnapshots(
    amm: AutomaticMarketMaker,
    lpSnapshots: SnapshotsInterface[],
    lpPositions: UniswapLiquidityPosition[],
  ): void {
    lpSnapshots = lpSnapshots.sort((a, b) => a.information.timestamp - b.information.timestamp);

    amm.liquidityPositions.map((l) => {
      const currentPairSnapshots = lpSnapshots.filter(
        (s) => s.information.pair.id === l.lpToken.address,
      );

      if (l.lpTokenBalance === '0' && currentPairSnapshots[currentPairSnapshots.length - 1]) {
        l.exitedAt = currentPairSnapshots[currentPairSnapshots.length - 1].information.timestamp;
      }
      const uniswapLpPosition = lpPositions.find((u) => u.pair.id === l.lpToken.address);
      // liquidity snapshots is already ordered
      for (let i = 0; i < currentPairSnapshots.length; i++) {
        const sn1Data: FeesSn1Data = {
          tokenSupply: new BN(
            currentPairSnapshots[i].information.liquidityTokenTotalSupply,
          ).toNumber(),
          tokenBalance: new BN(
            currentPairSnapshots[i].information.liquidityTokenBalance,
          ).toNumber(),
          reserve0: new BN(currentPairSnapshots[i].information.reserve0).toNumber(),
          reserve1: new BN(currentPairSnapshots[i].information.reserve1).toNumber(),
        };

        let sn2Data: FeesSn2Data = null;
        if (currentPairSnapshots[i + 1] !== undefined) {
          sn2Data = {
            tokenSupply: new BN(
              currentPairSnapshots[i + 1].information.liquidityTokenTotalSupply,
            ).toNumber(),
            totalReserve: new BN(currentPairSnapshots[i + 1].information.reserveUSD).toNumber(),
            reserve0: new BN(currentPairSnapshots[i + 1].information.reserve0).toNumber(),
            reserve1: new BN(currentPairSnapshots[i + 1].information.reserve1).toNumber(),
          };
        } else {
          sn2Data = {
            tokenSupply: new BN(l.lpToken.totalSupply).toNumber(),
            totalReserve: new BN(uniswapLpPosition.pair.reserveUSD).toNumber(),
            reserve0: new BN(l.poolTokens[0].reserve).toNumber(),
            reserve1: new BN(l.poolTokens[1].reserve).toNumber(),
          };
        }
        l.earnedFeeUSD += this.getFeeBetweenTwoSnapshots(sn1Data, sn2Data);
      }
    });
  }

  private mapLiquidityPositions(
    amm: AutomaticMarketMaker,
    uniswapPositions: UniswapLiquidityPosition[],
  ): void {
    for (const uniswapPosition of uniswapPositions) {
      const pool: LiquidityPool = {
        address: uniswapPosition.pair.id,
        name: null,
      };
      const lpToken: ERC20Token = {
        address: uniswapPosition.pair.id,
        decimals: 18, // always 18 in Uniswap
        name: null,
        symbol: null,
        totalSupply: uniswapPosition.pair.totalSupply,
      };

      const { pair } = uniswapPosition;
      const { token0, token1 } = pair;

      const userPoolShare =
        Number(uniswapPosition.liquidityTokenBalance) / Number(pair.totalSupply);

      const [poolToken0, poolToken1] = this.mapFromUniswapTokenToPoolToken(
        token0,
        token1,
        undefined,
        uniswapPosition.pair,
        userPoolShare,
      );

      const project = amm.protocolName === 'uniswap' ? 'Uniswap V2' : amm.protocolName;
      const liquidityPosition: LiquidityPosition = {
        pool: pool,
        lpToken,
        lpTokenBalance: uniswapPosition.liquidityTokenBalance,
        project: project,
        poolTokens: [poolToken0, poolToken1],
        earnedFeeUSD: 0,
        exitedAt: null,
      };

      amm.liquidityPositions.push(liquidityPosition);
    }
  }

  private mapFromUniswapTokenToPoolToken(
    token0: UniswapToken,
    token1: UniswapToken,
    entity?: UniversalEntity,
    pair?: UniswapLiquidityPositionPair,
    userPoolShare?: number,
  ) {
    const poolToken0 = {
      address: token0.id,
      decimals: Number(token0.decimals),
      name: token0.name,
      symbol: token0.symbol,
      totalSupply: null,
      reserve: pair === undefined ? null : pair.reserve0,
      amount:
        entity === undefined
          ? (userPoolShare * Number(pair.reserve0)).toString()
          : entity.information.amount0,
      priceUSD:
        pair === undefined
          ? this.priceInUSD(entity.information.amountUSD, entity.information.amount0)
          : this.priceInUSD(pair.reserveUSD, pair.reserve0),
      percentage: this.PERSENTAGE,
    };

    const poolToken1 = {
      address: token1.id,
      decimals: Number(token1.decimals),
      name: token1.name,
      symbol: token1.symbol,
      totalSupply: null,
      reserve: pair === undefined ? null : pair.reserve1,
      amount:
        entity === undefined
          ? (userPoolShare * Number(pair.reserve1)).toString()
          : entity.information.amount1,
      priceUSD:
        pair === undefined
          ? this.priceInUSD(entity.information.amountUSD, entity.information.amount1)
          : this.priceInUSD(pair.reserveUSD, pair.reserve1),
      percentage: this.PERSENTAGE,
    };

    return [poolToken0, poolToken1];
  }

  private createLiquidityChangeTransaction(
    entity: UniversalEntity,
    uniswapTokens: PoolToken[],
    flag: boolean,
  ): LiquidityChangeTransaction {
    return {
      type: flag ? LiquidityChangeTypeEnum.addLiquidity : LiquidityChangeTypeEnum.removeLiquidity,
      hash: entity.information.transaction.id,
      blockNumber: Number(entity.blockNumber),
      timestamp: Number(entity.information.transaction.timestamp),
      liquidity: entity.information.liquidity,
      amountUSD: Number(entity.information.amountUSD),
      gasPrice: null,
      gasPriceUsd: null,
      gasUsed: null,
      lpTokenAddress: entity.information.pair.id,
      tokens: [uniswapTokens[0], uniswapTokens[1]],
    };
  }

  private getOriginAddress(originArray: string[], address: string): string {
    return originArray.find((origin) => origin.toLowerCase() === address);
  }

  protected async mapStakingPositions(
    staking: Staking,
    liquidityPositions: UniswapLiquidityPosition[],
    stakingPositions,
  ) {
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

            const poolToken0 = {
              address: token0.id,
              decimals: Number(token0.decimals),
              name: token0.name,
              symbol: token0.symbol,
              totalSupply: null,
              amount: userPoolShare.times(reserve0).toString(),
              reserve: reserve0,
              priceUSD: this.priceInUSD(element1.pair.reserveUSD, reserve0),
              percentage: this.PERSENTAGE,
            };

            const poolToken1 = {
              address: token1.id,
              decimals: Number(token1.decimals),
              name: token1.name,
              symbol: token1.symbol,
              totalSupply: null,
              amount: userPoolShare.times(reserve1).toString(),
              reserve: reserve1,
              priceUSD: this.priceInUSD(element1.pair.reserveUSD, reserve1),
              percentage: this.PERSENTAGE,
            };
            position.liquidityPoolTokens.push(poolToken0, poolToken1);
          }
        });

        if (position.liquidityPoolTokens && position.liquidityPoolTokens.length) {
          StakingPositionsToPush.push(position);
        }
      }
    }
    staking.stakingPositions.push(...StakingPositionsToPush);
  }

  private async getPendingSushi(poolId, userId) {
    const masterChiefAddress = '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd';
    const provider = this.chainProvider.instanceEth();
    const contract = await new provider.eth.Contract(abi as AbiItem[], masterChiefAddress);
    return await contract.methods.pendingSushi(poolId, userId).call();
  }
}

type UniversalEntity = BurnsInterface | MintsInterface;
