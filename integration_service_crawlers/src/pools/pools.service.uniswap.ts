import { Injectable } from '@nestjs/common';

import { LiquidityPool } from '../store/dto/liquiditypool/liquiditypool.dto';
import { Token } from '../store/dto/liquiditypool/token.dto';
import { BlocksSubgraph } from '../thegraph/blocks/blocks.subgraph';
import { Pair } from '../thegraph/uniswap/pair.interface';
import { UniswapSubgraph } from '../thegraph/uniswap/uniswap.subgraph';
import {
  CHAIN_ID_ETH,
  getIl,
  getLastDayApy,
  getLastMonthApy,
  getLastWeekApy,
  mergeUniswapData,
  PROJECT_UNISWAP,
  TIMESTAMP_DAY_BEFORE_CURRENT,
  TIMESTAMP_MONTH_BEFORE_CURRENT,
  TIMESTAMP_WEEK_BEFORE_CURRENT,
} from './pools.utils';

@Injectable()
export class PoolsServiceUniswap {
  protected chain: number = CHAIN_ID_ETH;
  protected project: string = PROJECT_UNISWAP;
  protected minTVL = 50000;
  constructor(
    protected readonly uniswapSubgraph: UniswapSubgraph,
    protected readonly blocksSubgraph: BlocksSubgraph,
  ) {}
  // get up to 3k pools with all necessary calculations, processing can be up to 10 sec
  async getPoolsToHandle(): Promise<LiquidityPool[]> {
    const [blockDataDayBefore, blockDataWeekBefore, blockDataMonthBefore] = await Promise.all([
      this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_DAY_BEFORE_CURRENT),
      this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_WEEK_BEFORE_CURRENT),
      this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_MONTH_BEFORE_CURRENT),
    ]);
    const lastDayBlockNumber = blockDataDayBefore.data.blocks[0].number;
    const lastWeekBlockNumber = blockDataWeekBefore.data.blocks[0].number;
    const lastMonthBlockNumber = blockDataMonthBefore.data.blocks[0].number;

    // get up to 3k pair in concurrent requests
    const [
      pairsDataCurrent,
      pairsDataDayBefore,
      pairsDataWeekBefore,
      pairsDataMonthBefore,
    ] = await Promise.all([
      this.uniswapSubgraph.getPairs(this.minTVL),
      this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastDayBlockNumber),
      this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastWeekBlockNumber),
      this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastMonthBlockNumber),
    ]);
    const allCurrentPairsData = mergeUniswapData(pairsDataCurrent);
    const allPairsDataDayBefore = mergeUniswapData(pairsDataDayBefore);
    const allPairsDataWeekBefore = mergeUniswapData(pairsDataWeekBefore);
    const allPairsDataMonthBefore = mergeUniswapData(pairsDataMonthBefore);

    return this.getPairsWithCalculatedFields(allCurrentPairsData, [
      allPairsDataDayBefore,
      allPairsDataWeekBefore,
      allPairsDataMonthBefore,
    ]);
  }

  protected getPairsWithCalculatedFields(
    currentPairs,
    [lastDayPairs, lastWeekPairs, lastMonthPairs],
  ): LiquidityPool[] {
    return currentPairs.map((currentPair) => {
      function getHistoryPair(pairs): Pair {
        if (pairs) {
          return pairs.find((pair) => currentPair.id === pair.id);
        }
        return null;
      }

      const lastDayPair = getHistoryPair(lastDayPairs);
      const lastWeekPair = getHistoryPair(lastWeekPairs);
      const lastMonthPair = getHistoryPair(lastMonthPairs);

      const volume24hrsUSD: number = lastDayPair
        ? Math.trunc(currentPair.untrackedVolumeUSD - lastDayPair.untrackedVolumeUSD)
        : null;
      const fee24h: number = volume24hrsUSD ? volume24hrsUSD * 0.003 : null;

      const [dayILPercent, dayIlUSD] = lastDayPair
        ? getIl(currentPair, lastDayPair)
        : [null, null]
      const [weekILPercent, weekIlUSD] = lastWeekPair
        ? getIl(currentPair, lastWeekPair)
        : [null, null]
      const [monthILPercent, monthIlUSD] = lastMonthPair
        ? getIl(currentPair, lastMonthPair)
        : [null, null]

      const dayAPY: number = lastDayPair
        ? getLastDayApy(
            currentPair.reserveUSD,
            currentPair.untrackedVolumeUSD - lastDayPair.untrackedVolumeUSD,
          )
        : null;
      const weekAPY: number = lastWeekPair
        ? getLastWeekApy(
            currentPair.reserveUSD,
            currentPair.untrackedVolumeUSD - lastWeekPair.untrackedVolumeUSD,
          )
        : null;
      const monthAPY: number = lastMonthPair
        ? getLastMonthApy(
            currentPair.reserveUSD,
            currentPair.untrackedVolumeUSD - lastMonthPair.untrackedVolumeUSD,
          )
        : null;

      const dayIL: number = lastDayPair
        ? dayILPercent
        : null;
      const weekIL: number = lastWeekPair
        ? weekILPercent
        : null;
      const monthIL: number = lastMonthPair
        ? monthILPercent
        : null;

      const percentage = 50;
      const token0: Token = {
        id: currentPair.token0.id,
        name: currentPair.token0.name,
        symbol: currentPair.token0.symbol,
        percentage: percentage,
        reserve: parseFloat(currentPair.reserve0),
      };
      const token1: Token = {
        id: currentPair.token1.id,
        name: currentPair.token1.name,
        symbol: currentPair.token1.symbol,
        percentage: percentage,
        reserve: parseFloat(currentPair.reserve1),
      };

      const pool: LiquidityPool = {
        id: currentPair.id,
        chain: this.chain,
        project: this.project,
        reserveUSD: parseInt(currentPair.reserveUSD),
        fee24h: fee24h,
        apy: {
          day: dayAPY,
          week: weekAPY,
          month: monthAPY,
        },
        il: {
          day: dayIL,
          dayUSD: dayIlUSD,
          week: weekIL,
          weekUSD: weekIlUSD,
          month: monthIL,
          monthUSD: monthIlUSD,
        },
        poolToken: {
          id: currentPair.id,
          totalSupply: parseFloat(currentPair.totalSupply),
        },
        tokens: [token0, token1],
      };
      return pool;
    });
  }
}
