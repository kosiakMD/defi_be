import { Injectable } from '@nestjs/common';
import { UniswapSubgraph } from '../thegraph/uniswap/uniswap.subgraph';
import { BlocksSubgraph } from '../thegraph/blocks/blocks.subgraph';
import {
	CHAIN_ETH,
	getImpermanentLossPercent,
	getImpermanentLossUSD,
	getLastDayApy,
	getLastMonthApy,
	getLastWeekApy,
	getLpTokenPrice, mergeUniswapData,
	PROJECT_UNISWAP,
	TIMESTAMP_DAY_BEFORE_CURRENT,
	TIMESTAMP_MONTH_BEFORE_CURRENT,
	TIMESTAMP_WEEK_BEFORE_CURRENT
} from './pools.utils';
import { LiquidityPool } from './dto/liquiditypool.dto';
import { Token } from './dto/token.dto';
import { Pair } from '../thegraph/uniswap/pair.interface';

@Injectable()
export class PoolsServiceUniswap {
	protected chain: string = CHAIN_ETH
	protected project: string = PROJECT_UNISWAP
	protected minTVL: number = 50000
	constructor(protected readonly uniswapSubgraph: UniswapSubgraph,
							protected readonly blocksSubgraph: BlocksSubgraph
	) {}
	// get up to 3k pools with all necessary calculations, processing can be up to 10 sec
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
		const allCurrentPairsData = mergeUniswapData(pairsDataCurrent)
		const allPairsDataDayBefore = mergeUniswapData(pairsDataDayBefore)
		const allPairsDataWeekBefore = mergeUniswapData(pairsDataWeekBefore)
		const allPairsDataMonthBefore = mergeUniswapData(pairsDataMonthBefore)

		return this.getPairsWithCalculatedFields(allCurrentPairsData, [allPairsDataDayBefore, allPairsDataWeekBefore, allPairsDataMonthBefore])
	}

	protected getPairsWithCalculatedFields(currentPairs, [lastDayPairs, lastWeekPairs, lastMonthPairs]): LiquidityPool[] {
		return currentPairs.map(currentPair => {
			function getHistoryPair(pairs): Pair {
				if(pairs) {
					return pairs.find(pair => currentPair.id === pair.id)
				}
				return null
			}

			const lastDayPair = getHistoryPair(lastDayPairs)
			const lastWeekPair = getHistoryPair(lastWeekPairs)
			const lastMonthPair = getHistoryPair(lastMonthPairs)

			const volume24hrsUSD: number = lastDayPair ? Math.trunc(currentPair.untrackedVolumeUSD - lastDayPair.untrackedVolumeUSD) : null
			const fee24h: number = volume24hrsUSD ? volume24hrsUSD * 0.003 : null

			const dayAPY: number = lastDayPair ? getLastDayApy(currentPair.reserveUSD, currentPair.untrackedVolumeUSD - lastDayPair.untrackedVolumeUSD) : null
			const weekAPY: number = lastWeekPair ? getLastWeekApy(currentPair.reserveUSD, currentPair.untrackedVolumeUSD - lastWeekPair.untrackedVolumeUSD) : null
			const monthAPY: number = lastMonthPair ? getLastMonthApy(currentPair.reserveUSD, currentPair.untrackedVolumeUSD - lastMonthPair.untrackedVolumeUSD) : null

			const currentLpToken: number = getLpTokenPrice(currentPair.reserveUSD, currentPair.totalSupply)
			const dayIL: number = lastDayPair ? getImpermanentLossPercent(currentLpToken, getLpTokenPrice(lastDayPair.reserveUSD, lastDayPair.totalSupply)) : null
			const weekIL: number = lastWeekPair ? getImpermanentLossPercent(currentLpToken, getLpTokenPrice(lastWeekPair.reserveUSD, lastWeekPair.totalSupply)) : null
			const monthIL: number = lastMonthPair ? getImpermanentLossPercent(currentLpToken, getLpTokenPrice(lastMonthPair.reserveUSD, lastMonthPair.totalSupply)) : null

			const percentage: number = 50
			const token0: Token = {
				id: currentPair.token0.id,
				name: currentPair.token0.name,
				symbol: currentPair.token0.symbol,
				percentage: percentage,
				reserve: parseFloat(currentPair.reserve0)
			}
			const token1: Token = {
				id: currentPair.token1.id,
				name: currentPair.token1.name,
				symbol: currentPair.token1.symbol,
				percentage: percentage,
				reserve: parseFloat(currentPair.reserve1)
			}

			let pool: LiquidityPool = {
				id: currentPair.id,
				chain: this.chain,
				project: this.project,
				reserveUSD: parseInt(currentPair.reserveUSD),
				fee24h: fee24h,
				apy: {
					day: dayAPY,
					week: weekAPY,
					month: monthAPY
				},
				il: {
					day: dayIL,
					dayUSD: getImpermanentLossUSD(currentPair.reserveUSD, dayIL),
					week: weekIL,
					weekUSD: getImpermanentLossUSD(currentPair.reserveUSD, weekIL),
					month: monthIL,
					monthUSD: getImpermanentLossUSD(currentPair.reserveUSD, monthIL)
				},
				poolToken: {
					id: currentPair.id,
					totalSupply: parseFloat(currentPair.totalSupply)
				},
				tokens: [
					token0,
					token1
				]
			}
			return pool
		})
	}
}
