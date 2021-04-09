import { Inject, Injectable } from '@nestjs/common';

import { BlocksSubgraph } from '../thegraph/blocks.subgraph';
import { UniswapSubgraph } from '../thegraph/uniswap.subgraph';
import { PoolDto } from './dto/pool.dto';
import {
  CHAIN_ETH,
  getArrayPairsFromResponseData,
  getImpermanentLossPercent,
  getImpermanentLossUSD,
  getLastDayApy,
  getLastMonthApy,
  getLastWeekApy,
  getLpTokenPrice, MIN_RESERVE,
  PROJECT_UNISWAP,
  TIMESTAMP_DAY_BEFORE_CURRENT,
  TIMESTAMP_MONTH_BEFORE_CURRENT,
  TIMESTAMP_WEEK_BEFORE_CURRENT,
} from './pools.utils';

@Injectable()
export class PoolsServiceUniswap {
  protected chain: string = CHAIN_ETH;
  protected project: string = PROJECT_UNISWAP;

  constructor(
    @Inject(UniswapSubgraph) protected readonly uniswapSubgraph: UniswapSubgraph,
    @Inject(BlocksSubgraph) protected readonly blocksSubgraph: BlocksSubgraph,
  ) {
  }

  // get up to 3k pools with all necessary calculations, processing can be up to 10 sec
  async getPoolsToHandle(): Promise<PoolDto[]> {
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
      this.uniswapSubgraph.getPairs(MIN_RESERVE),
      this.uniswapSubgraph.getPairsInBlockState(MIN_RESERVE, lastDayBlockNumber),
      this.uniswapSubgraph.getPairsInBlockState(MIN_RESERVE, lastWeekBlockNumber),
      this.uniswapSubgraph.getPairsInBlockState(MIN_RESERVE, lastMonthBlockNumber),
    ]);
    const allCurrentPairsData = getArrayPairsFromResponseData(pairsDataCurrent);
    const allPairsDataDayBefore = getArrayPairsFromResponseData(pairsDataDayBefore);
    const allPairsDataWeekBefore = getArrayPairsFromResponseData(pairsDataWeekBefore);
    const allPairsDataMonthBefore = getArrayPairsFromResponseData(pairsDataMonthBefore);

    return this.getPairsWithCalculatedFields(
      allCurrentPairsData,
      [allPairsDataDayBefore, allPairsDataWeekBefore, allPairsDataMonthBefore],
      this.project,
      this.chain,
    );
  }

  protected getPairsWithCalculatedFields(
    currentPairs,
    [lastDayPairs, lastWeekPairs, lastMonthPairs],
    projectName: string,
    chain: string,
  ): PoolDto[] {
    return currentPairs.map((currentPair) => {
      function getHistoryPair(pairs) {
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

      const currentLpToken: number = getLpTokenPrice(
        currentPair.reserveUSD,
        currentPair.totalSupply,
      );
      const dayIL: number = lastDayPair
        ? getImpermanentLossPercent(
          currentLpToken,
          getLpTokenPrice(lastDayPair.reserveUSD, lastDayPair.totalSupply),
        )
        : null;
      const weekIL: number = lastWeekPair
        ? getImpermanentLossPercent(
          currentLpToken,
          getLpTokenPrice(lastWeekPair.reserveUSD, lastWeekPair.totalSupply),
        )
        : null;
      const monthIL: number = lastMonthPair
        ? getImpermanentLossPercent(
          currentLpToken,
          getLpTokenPrice(lastMonthPair.reserveUSD, lastMonthPair.totalSupply),
        )
        : null;

      const percentage = 50;
      const token0 = {
        id: currentPair.token0.id,
        name: currentPair.token0.name,
        symbol: currentPair.token0.symbol,
        percentage: percentage,
        reserve: parseFloat(currentPair.reserve0),
      };
      const token1 = {
        id: currentPair.token1.id,
        name: currentPair.token1.name,
        symbol: currentPair.token1.symbol,
        percentage: percentage,
        reserve: parseFloat(currentPair.reserve1),
      };

      return {
        id: currentPair.id,
        chain: chain,
        project: projectName,
        reserveUSD: parseInt(currentPair.reserveUSD),
        fee24h: fee24h,
        APY: {
          day: dayAPY,
          week: weekAPY,
          month: monthAPY,
        },
        IL: {
          day: dayIL,
          dayUSD: getImpermanentLossUSD(currentPair.reserveUSD, dayIL),
          week: weekIL,
          weekUSD: getImpermanentLossUSD(currentPair.reserveUSD, weekIL),
          month: monthIL,
          monthUSD: getImpermanentLossUSD(currentPair.reserveUSD, monthIL),
        },
        poolToken: {
          id: currentPair.id,
          totalSupply: parseFloat(currentPair.totalSupply),
        },
        tokens: [token0, token1],
      };
    });
  }
}
