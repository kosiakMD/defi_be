import { Injectable } from '@nestjs/common';
import { BigNumber as BN } from 'bignumber.js';

import { UniswapBurnsEntity } from '../entities/uniswap.burns.entity';
import { UniswapMintsEntity } from '../entities/uniswap.mints.entity';
import { UniswapSnapshotsEntity } from '../entities/uniswap.snapshots.entity';
import { UniswapSwapsEntity } from '../entities/uniswap.swaps.entity';
import { UniswapToken } from '../interfaces/entity.information.interfaces';
import { FeesSn1Data, FeesSn2Data } from '../interfaces/fee.interfaces';
import {
  LiquidityPool,
  LiquidityPosition,
  UniswapLiquidityPosition,
  UniswapLiquidityPositionPair,
} from '../interfaces/liquidity.position.interfaces';
import {
  AutomaticMarketMaker,
  Base,
  ERC20Token,
  LiquidityChangeTransaction,
  PoolToken,
  UniswapResponseData,
  SwapToken,
  SwapTransaction,
  Transactions,
} from '../uniswap.interfaces';

@Injectable()
export class UniswapMapper {
  private PERSENTAGE = 50;

  public async mapData(userAddresses: string[], response: UniswapResponseData): Promise<Base[]> {
    const base: Base[] = [];
    for (const address of userAddresses) {
      const transactions: Transactions = {
        protocolType: 'transaction',
        protocolName: 'uniswap',
        userAddress: address,
        txs: [],
      };

      const amm: AutomaticMarketMaker = {
        protocolType: 'amm',
        protocolName: 'uniswap',
        userAddress: address,
        liquidityPositions: [],
      };

      // TODO: functional for getting liquidityPositions from uniswapSnapshot array
      // const pairMap = UniswapService.groupBy(
      //   response.uniswapSnapshots.get(address) == undefined
      //     ? []
      //     : response.uniswapSnapshots.get(address),
      //   (snapshot) => snapshot.information.pair.id,
      // );
      // for (const item of pairMap.values()) {
      //   const sorted = await item.sort((a, b) => a.information.timestamp - b.information.timestamp);
      //   const currentLiquidityPostion = sorted[sorted.length - 1];
      //   amm.liquidityPositions.push({
      //     id: currentLiquidityPostion.information.pair.id,
      //     balance: currentLiquidityPostion.information.liquidityTokenBalance,
      //     earnedFeeUSD: 0,
      //     exitedAt:
      //       currentLiquidityPostion.information.liquidityTokenBalance === '0'
      //         ? currentLiquidityPostion.information.timestamp
      //         : 0,
      //   });
      // }

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

  private mapMints(transactions: Transactions, mints: UniswapMintsEntity[]): void {
    for (const mint of mints) {
      const { token0, token1 } = mint.information.pair;
      const [poolToken0, poolToken1] = this.mapFromUniswapTokenToPoolToken(token0, token1, mint);

      const ammMint: LiquidityChangeTransaction = this.createLiquidityChangeTransaction(mint, [
        poolToken0,
        poolToken1,
      ]);

      transactions.txs.push(ammMint);
    }
  }

  private mapBurns(transactions: Transactions, burns: UniswapBurnsEntity[]) {
    for (const burn of burns) {
      const { token0, token1 } = burn.information.pair;

      const [poolToken0, poolToken1] = this.mapFromUniswapTokenToPoolToken(token0, token1, burn);

      const ammBurn: LiquidityChangeTransaction = this.createLiquidityChangeTransaction(burn, [
        poolToken0,
        poolToken1,
      ]);

      transactions.txs.push(ammBurn);
    }
  }

  private mapSwaps(transactions: Transactions, swapFrom: UniswapSwapsEntity[]) {
    for (const swap of swapFrom) {
      const ammSwap: SwapTransaction = {
        type: 'swap',
        hash: swap.information.id,
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
        (t) => t.type == 'swap' && t.hash == swap.information.id,
      ) as SwapTransaction;
      if (existedSwap) {
        // can be used logIndex here, but as subgraph returns data in the same order this works too
        if (ammSwap.tokenIn.address == existedSwap.tokenOut.address) {
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

  private getFeeBetweenTwoSnapshots(sn1: FeesSn1Data, sn2: FeesSn2Data) {
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
    lpSnapshots: UniswapSnapshotsEntity[],
    lpPositions: UniswapLiquidityPosition[],
  ): void {
    lpSnapshots = lpSnapshots.sort((a, b) => a.information.timestamp - b.information.timestamp);

    amm.liquidityPositions.map(async (l) => {
      const currentPairSnapshots = lpSnapshots.filter(
        (s) => s.information.pair.id === l.lpToken.address,
      );
      const uniswapLpPosition = lpPositions.find((u) => u.pair.id == l.lpToken.address);
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
        if (currentPairSnapshots[i + 1] != undefined) {
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
        l.earnedFeeUSD += await this.getFeeBetweenTwoSnapshots(sn1Data, sn2Data);
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

      const userPoolShare = new BN(uniswapPosition.liquidityTokenBalance).div(pair.totalSupply);

      const [poolToken0, poolToken1] = this.mapFromUniswapTokenToPoolToken(
        token0,
        token1,
        undefined,
        uniswapPosition.pair,
        userPoolShare,
      );

      const liquidityPosition: LiquidityPosition = {
        pool: pool,
        lpToken,
        lpTokenBalance: uniswapPosition.liquidityTokenBalance,
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
    userPoolShare?: BN,
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
          ? userPoolShare.times(pair.reserve0).toString()
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
          ? userPoolShare.times(pair.reserve1).toString()
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
  ): LiquidityChangeTransaction {
    return {
      type: entity instanceof UniswapMintsEntity ? 'addLiquidity' : 'removeLiquidity',
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
}

type UniversalEntity = UniswapBurnsEntity | UniswapMintsEntity;
