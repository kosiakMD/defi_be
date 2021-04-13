import { Injectable } from '@nestjs/common';
import {
	CHAIN_BSC,
	PROJECT_PANCAKE,
	TIMESTAMP_DAY_BEFORE_CURRENT,
	TIMESTAMP_MONTH_BEFORE_CURRENT,
	TIMESTAMP_WEEK_BEFORE_CURRENT
} from './pools.utils';
import { PoolsServiceUniswap } from './pools.service.uniswap';
import { PancakeSubgraph } from '../thegraph/pancake/pancake.subgraph';
import { BlocksBscSubgraph } from '../thegraph/blocks/blocks.bsc.subgraph';
import { LiquidityPool } from './dto/liquiditypool.dto';

@Injectable()
export class PoolsServicePancake extends PoolsServiceUniswap {
	protected chain: string = CHAIN_BSC
	protected project: string = PROJECT_PANCAKE
	protected minTVL: number = 50000
	constructor(protected readonly pancakeSubgraph: PancakeSubgraph,
							protected readonly blocksBscSubgraph: BlocksBscSubgraph
	) {
		super(pancakeSubgraph, blocksBscSubgraph)
	}
	async getPoolsToHandle(): Promise<LiquidityPool[]> {
		let [blockDataDayBefore, blockDataWeekBefore, blockDataMonthBefore] = await Promise.all([
			this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_DAY_BEFORE_CURRENT),
			this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_WEEK_BEFORE_CURRENT),
			this.blocksSubgraph.getFirstAfterTimestamp(TIMESTAMP_MONTH_BEFORE_CURRENT),
		])
		const lastDayBlockNumber = blockDataDayBefore.data.blocks[0].number
		const lastWeekBlockNumber = blockDataWeekBefore.data.blocks[0].number
		const lastMonthBlockNumber = blockDataMonthBefore.data.blocks[0].number

		// get up to 3k pair in concurrent requests
		let [pairsDataCurrent, pairsDataDayBefore, pairsDataWeekBefore, pairsDataMonthBefore] = await Promise.all([
			this.uniswapSubgraph.getPairs(this.minTVL),
			this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastDayBlockNumber),
			this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastWeekBlockNumber),
			this.uniswapSubgraph.getPairsInBlockState(this.minTVL, lastMonthBlockNumber),
		])
		const allCurrentPairsData = pairsDataCurrent.data.from0to1000
		// in case of subgraph is not synced yet
		const allPairsDataDayBefore = pairsDataDayBefore.data === undefined ? [] : pairsDataDayBefore.data.from0to1000
		const allPairsDataWeekBefore = pairsDataWeekBefore.data === undefined ? [] : pairsDataWeekBefore.data.from0to1000
		const allPairsDataMonthBefore = pairsDataMonthBefore.data === undefined ? [] : pairsDataMonthBefore.data.from0to1000

		return this.getPairsWithCalculatedFields(allCurrentPairsData, [allPairsDataDayBefore, allPairsDataWeekBefore, allPairsDataMonthBefore])
	}
}
