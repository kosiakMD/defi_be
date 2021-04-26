import { Inject, Injectable } from '@nestjs/common';

import { BalancerSubgraph } from '../thegraph/balancer/balancer.subgraph';
import { Pool } from '../thegraph/balancer/pool.interface';
import { BlocksSubgraph } from '../thegraph/blocks/blocks.subgraph';
import { LiquidityPool } from './dto/liquiditypool.dto';
import {
  CHAIN_ID_ETH,
  getImpermanentLossPercent,
  getImpermanentLossUSD,
  getLastDayApy,
  getLastMonthApy,
  getLastWeekApy,
  getLpTokenPrice,
  PROJECT_BALANCER,
  TIMESTAMP_DAY_BEFORE_CURRENT,
  TIMESTAMP_MONTH_BEFORE_CURRENT,
  TIMESTAMP_WEEK_BEFORE_CURRENT,
} from './pools.utils';

@Injectable()
export class PoolsServiceBalancer {
  protected chain: number = CHAIN_ID_ETH;
  protected project: string = PROJECT_BALANCER;
  protected minTVL = 50000;
  constructor(
    @Inject(BalancerSubgraph) protected readonly balancerSubgraph: BalancerSubgraph,
    @Inject(BlocksSubgraph) protected readonly blocksSubgraph: BlocksSubgraph,
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
      this.balancerSubgraph.getPairs(this.minTVL),
      this.balancerSubgraph.getPairsInBlockState(this.minTVL, lastDayBlockNumber),
      this.balancerSubgraph.getPairsInBlockState(this.minTVL, lastWeekBlockNumber),
      this.balancerSubgraph.getPairsInBlockState(this.minTVL, lastMonthBlockNumber),
    ]);
    const allCurrentPairsData = [...pairsDataCurrent.data.from0to1000];
    const allPairsDataDayBefore = [...pairsDataDayBefore.data.from0to1000];
    const allPairsDataWeekBefore = [...pairsDataWeekBefore.data.from0to1000];
    const allPairsDataMonthBefore = [...pairsDataMonthBefore.data.from0to1000];
    return this.getPairsWithCalculatedFields(allCurrentPairsData, [
      allPairsDataDayBefore,
      allPairsDataWeekBefore,
      allPairsDataMonthBefore,
    ]);
  }

  private getPairsWithCalculatedFields(
    pools: Pool[],
    [lastDayPools, lastWeekPools, lastMonthPools],
  ): LiquidityPool[] {
    return pools.map((pool) => {
      function getHistoryPair(historiLiquidities): Pool {
        return historiLiquidities.find((historyPool) => pool.id === historyPool.id);
      }

      const lastDayPool = getHistoryPair(lastDayPools);
      const lastWeekPool = getHistoryPair(lastWeekPools);
      const lastMonthPool = getHistoryPair(lastMonthPools);

      const dayAPY: number = lastDayPool
        ? getLastDayApy(pool.liquidity, pool.totalSwapVolume - lastDayPool.totalSwapVolume)
        : null;
      const weekAPY: number = lastWeekPool
        ? getLastWeekApy(pool.liquidity, pool.totalSwapVolume - lastWeekPool.totalSwapVolume)
        : null;
      const monthAPY: number = lastMonthPool
        ? getLastMonthApy(pool.liquidity, pool.totalSwapVolume - lastMonthPool.totalSwapVolume)
        : null;

      const currentLpToken: number = getLpTokenPrice(pool.liquidity, pool.totalShares);
      const dayIL: number = lastDayPool
        ? getImpermanentLossPercent(
            currentLpToken,
            getLpTokenPrice(lastDayPool.liquidity, lastDayPool.totalShares),
          )
        : null;
      const weekIL: number = lastWeekPool
        ? getImpermanentLossPercent(
            currentLpToken,
            getLpTokenPrice(lastWeekPool.liquidity, lastWeekPool.totalShares),
          )
        : null;
      const monthIL: number = lastMonthPool
        ? getImpermanentLossPercent(
            currentLpToken,
            getLpTokenPrice(lastMonthPool.liquidity, lastMonthPool.totalShares),
          )
        : null;

      const totalWeight: number = pool.tokens.reduce(
        (acc, token) => (acc += token.denormWeight),
        0,
      );
      const tokens = pool.tokens.map((token) => {
        const normalizationKoeff = 100 / totalWeight;
        const tokenNormalizeWeight = token.denormWeight * normalizationKoeff;
        return {
          id: token.address,
          name: token.name,
          symbol: token.symbol,
          percentage: parseFloat(tokenNormalizeWeight.toFixed(2)),
        };
      });

      const liquidityPool: LiquidityPool = {
        id: pool.id,
        project: this.project,
        chain: this.chain,
        reserveUSD: pool.liquidity,
        fee24h: pool.swapFee * pool.totalSwapVolume,
        apy: {
          day: dayAPY,
          week: weekAPY,
          month: monthAPY,
        },
        il: {
          day: dayIL,
          dayUSD: getImpermanentLossUSD(pool.liquidity, dayIL),
          week: weekIL,
          weekUSD: getImpermanentLossUSD(pool.liquidity, weekIL),
          month: monthIL,
          monthUSD: getImpermanentLossUSD(pool.liquidity, monthIL),
        },
        poolToken: {
          id: 'id',
        },
        tokens: tokens,
      };
      return liquidityPool;
    });
  }
}
