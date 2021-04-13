import { Injectable } from '@nestjs/common';
import { CHAIN_ETH, PROJECT_CURVE } from './pools.utils';
import { LiquidityPool } from './dto/liquiditypool.dto';
import { CurveSubgraph } from '../thegraph/curve/curve.subgraph';
import { CurveApi } from '../apis/api/curve.api';
import { CoingeckoApi } from '../apis/api/coingecko.api';

@Injectable()
export class PoolsServiceCurve {
	protected chain: string = CHAIN_ETH
	protected project: string = PROJECT_CURVE

	constructor(protected readonly curveSubgraph: CurveSubgraph,
							protected readonly curveApi: CurveApi,
							protected readonly coingeckoApi: CoingeckoApi,
	) {
	}

	// get up to 3k pools with all necessary calculations, processing can be up to 10 sec
	async getPoolsToHandle(): Promise<LiquidityPool[]> {
		const [pools, poolsApy, etalonPricesUSD, eurPrice] = await Promise.all([
			this.curveSubgraph.getAllPools(),
			this.curveApi.getApys(),
			this.coingeckoApi.getUSDPricesByIds('usd', ['ethereum', 'bitcoin']),
			// get eurs price as tether price
			this.coingeckoApi.getUSDPricesByIds('eur', ['tether']),
		])
		return this.getCalcucatedCurvePools(pools.data.pools, poolsApy, [...etalonPricesUSD, ...eurPrice], this.project, this.chain)

	}

	private getCalcucatedCurvePools(currentPools, historicalPools, prices, projectName: string, chain: string): LiquidityPool[] {
		const DECIMAL: number = 18

		return currentPools.map(pool => {
			const etalonTokenPrice = PoolsServiceCurve.getTokenPriceUSD(pool, prices)

			const reserveUSD: number = pool.poolTokenSupply * Math.pow(10, -DECIMAL) * pool.virtualPrice * etalonTokenPrice
			const fee24h: number = historicalPools.volume[pool.name] * 0.0004

			const tokensIDsInOrder: string[] = pool.assignedCoins.split(',')
			const tokenOrderIndex = id => tokensIDsInOrder.indexOf(id)

			const summTokensWithDecimals: number = pool.coins.reduce((acc, coin) => acc += pool.balances[tokenOrderIndex(coin.id)] * Math.pow(10, -coin.decimals), 0)
			const tokens = pool.coins.map(coin => {
				return {
					id: coin.id,
					name: coin.id === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? 'ETH' : coin.name,
					symbol: coin.id === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? 'ETH' : coin.symbol,
					percentage: parseInt(((pool.balances[tokenOrderIndex(coin.id)] * Math.pow(10, -coin.decimals)) * (100 / summTokensWithDecimals)).toFixed())
				}
			})
			let liquidityPool: LiquidityPool = {
				id: pool.id,
				chain: chain,
				project: projectName,
				reserveUSD: reserveUSD,
				fee24h: fee24h,
				poolToken: {
					id: pool.poolToken.id,
					name: pool.poolToken.name,
					decimals: pool.poolToken.decimals,
					totalSupply: pool.poolTokenSupply
				},
				apy: {
					day: historicalPools.apy.day[pool.name],
					week: historicalPools.apy.week[pool.name],
					month: historicalPools.apy.month[pool.name],
				},
				il: {
					day: 0,
					dayUSD: 0,
					week: 0,
					weekUSD: 0,
					month: 0,
					monthUSD: 0
				},
				tokens: tokens
			}
			return liquidityPool
		})
	}

	private static getTokenPriceUSD(pool: any, prices: any): number {
		// this means that pool has BTC as etalon token
		if (pool.name.includes('btc') || pool.name === 'ren') {
			const btcPriceUSD = prices.find(p => p.id == 'bitcoin')
			return btcPriceUSD.current_price
		}
		// this means that pool has ETH as etalon token
		if (pool.name.includes('eth')) {
			const ethPriceUSD = prices.find(p => p.id == 'ethereum')
			return ethPriceUSD.current_price
		}
		// this means that pool has ETH as etalon token
		if (pool.name.includes('eur')) {
			const ethPriceUSD = prices.find(p => p.id == 'tether')
			return 1 / ethPriceUSD.current_price
		}
		return 1
	}
}
