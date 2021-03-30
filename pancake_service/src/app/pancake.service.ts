import { Injectable } from '@nestjs/common';
import { Pancake } from './interfaces/pancake.interface';
import { TheGraphQuery } from './interfaces/graph.interface';
//import { Blocks } from './interfaces/blocks.interface';
import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config();

@Injectable()
export class PancakesService {
	private readonly PROJECT_NAME: string = 'pancakeswap'
	/* private readonly NOW_UNIX_TIMESTAMP: number = Math.trunc(Date.now() / 1000)
  private readonly YESTERDAY_UNIX_TIMESTAMP: number = Math.trunc(this.NOW_UNIX_TIMESTAMP - 86400)
  private readonly LAST_WEEK_UNIX_TIMESTAMP: number = Math.trunc(this.NOW_UNIX_TIMESTAMP - 86400 * 7)
  private readonly LAST_MONTH_UNIX_TIMESTAMP: number = Math.trunc(this.NOW_UNIX_TIMESTAMP - 86400 * 30) */

	public async getPancakes(): Promise<Pancake[]> {
		const pairs = await this.getAllPairs()

		return this.getFormatedPancakes(pairs.currentPairs)
	}

	private getFormatedPancakes(currentPairs): Pancake[] {
		return currentPairs.map(pair => {
			const percentage: number = 50

			return {
				id: pair.id,
				projectName: this.PROJECT_NAME,
				reserveUSD: parseFloat(pair.reserveUSD),
				fee24h: null,
				APY: {
					day: null,
					week: null,
					month: null
				},
				IL: {
					day: null,
					dayUSD: null,
					week: null,
					weekUSD: null,
					month: null,
					monthUSD: null
				},
				tokens: [
					{
						name: pair.token0.name,
						percentage
					},
					{
						name: pair.token1.name,
						percentage
					}
				]
			}
		})
	}

	private async getAllPairs() {
		const [
			currentPairs,
			//blocks
		] = await Promise.all([
			this.getCurrentPairs(),
			//this.getHistoryBlocks(),
		]);

		//const pairsIDs = currentPairs.map(pair => pair.id)
		//const historyPairs = await this.getPairsByBlocksNumbers(pairsIDs, blocks)

		return {
			currentPairs,
			//historyPairs
		}
	}
// NOTE: functions to get history pairs by block number
/* 	private async getPairsByBlocksNumbers(pairsIDs: string[], blocks: Blocks): Promise<any> {
		const [
			pairsAtDayAgoState,
			pairsAtWeekAgoState,
			pairsAtMonthAgoState
		] = await Promise.all([
			this.getHistoryPairs(
				pairsIDs,
				blocks.lastDayblock
			),
			this.getHistoryPairs(
				pairsIDs,
				blocks.lastWeekblock
			),
			this.getHistoryPairs(
				pairsIDs,
				blocks.lastMonthblock
			),
		]);
		
		return {
			lastDayPairs: pairsAtDayAgoState,
			lastWeekPairs: pairsAtWeekAgoState,
			lastMonthPairs: pairsAtMonthAgoState
		};
	}

	private async getHistoryBlocks(): Promise<Blocks> {
		const [
			lastDayblock,
      lastWeekblock,
      lastMonthblock,
		] = await Promise.all([
			this.getHistoryBlock(this.YESTERDAY_UNIX_TIMESTAMP),
      this.getHistoryBlock(this.LAST_WEEK_UNIX_TIMESTAMP),
      this.getHistoryBlock(this.LAST_MONTH_UNIX_TIMESTAMP),
		]);
		
		return {
			lastDayblock,
			lastWeekblock,
			lastMonthblock
		};
	}

	private async getHistoryBlock(timestamp: number): Promise<any> {
		return (await axios.post(process.env.BLOCKS_REQUEST_URL, this.getHistoryBlockQuery(timestamp))).data.data.blocks[0]?.number;
	}

	private getHistoryBlockQuery(timestamp: number): TheGraphQuery {
    const SOME_SECONDS: number = 120
    return {
      "operationName":"blocks",
      "variables":{
        "timestampFrom":timestamp,
        "timestampTo":timestamp + SOME_SECONDS
      },
      "query":`query blocks($timestampFrom: Int!, $timestampTo: Int!) {
        blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: {timestamp_gt: $timestampFrom, timestamp_lt: $timestampTo}) {
          id
          number
        }
      }`
    }
  }

	private async getHistoryPairs(IDs: string[], blockNumber: string): Promise<any> {
		return (await axios.post(process.env.PAIRS_REQUEST_URL, this.getHistorySubgraphQuery(IDs, blockNumber))).data;
	}

	private getHistorySubgraphQuery(pairsIDs: string[], blockNumber: string): TheGraphQuery {
		return {
			operationName: "pairs",
			variables: {
				"allPairs": pairsIDs,
				"number": parseInt(blockNumber),
			},
			query: `fragment PairFields on Pair {
				id
				txCount
				token0 {
					id
					symbol
					name
					totalLiquidity
					derivedETH
				}
				token1 {
					id
					symbol
					name
					totalLiquidity
					derivedETH
				}
				reserve0
				reserve1
				reserveUSD
				totalSupply
				trackedReserveETH
				reserveETH
				volumeUSD
				untrackedVolumeUSD
				token0Price
				token1Price
				createdAtTimestamp
			}
			query pairs($allPairs: [Bytes]! $number: Int!) {
				pairs(block: {number: $number}, where: {id_in: $allPairs}) {
					...PairFields
				}
			}`
		};
	} */

	private async getCurrentPairs(): Promise<any> {
		return (await axios.post(process.env.PAIRS_REQUEST_URL, this.getSubgraphQuery())).data.data.pairs;
	}

	private getSubgraphQuery(): TheGraphQuery {
		return {
			operationName: "pairs",
			variables: {},
			query: `fragment PairFields on Pair {
				id
				untrackedVolumeUSD
				reserveUSD
				totalSupply
				token0 {
					id
					name
				}
				token1 {
					id
					name
				}
			}
			query pairs {
				pairs(first: 200, orderBy: trackedReserveETH, orderDirection: desc) {
					...PairFields
				}
			}`
		};
	}
}
