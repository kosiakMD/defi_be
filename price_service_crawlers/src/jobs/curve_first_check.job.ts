import { Injectable, Inject } from '@nestjs/common';
import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import {
	getCurrentCoinPrices,
	getCurrentEthPrice,
	getCurrentBtcPrice,
	getCoinHistoricalRangePrices,
} from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { isETH, toTimestamp } from '../utils/common';
import { ETH_ADDRESS, CURRENCY, TEST_TOKENS, PLATFORM } from '../utils/constants';

const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });

export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };

export type CoingeckoTokenPrices = { [key: string]: { value: number; db_id: any } };
const tokens: string[] = TEST_TOKENS;

@Injectable()
export class CurveFirstCheckJob {
	constructor(
		@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
		private databaseService: DatabaseService,
		private theGraphService: Api,
	) {}

	public async crawl_new_tokens(job: any, done: any): Promise<void> {
		try {
			const current_platfrom_id = await this.databaseService.getCurrentPlatform();
			if (!current_platfrom_id) {
				throw 'No current platform in DB: ' + PLATFORM;
			}

			const current_currency_id = await this.databaseService.getCurrentCurrency();
			if (!current_currency_id) {
				throw 'No current currency in DB: ' + CURRENCY;
			}

			console.log('request prepared');
			const poolsRequest = await this.theGraphService.getCurvePoolsTokens();

			const pools = poolsRequest['data']['data']['pools'];
			console.log('tokens ', pools);
			for (let i = 0; i < pools.length; i++) {
				const { virtualPrice, name, id, poolToken } = pools[i];

				//let pool_token_supply = Math.pow(10, -18) * Number(poolTokenSupply);
				//console.log("pool_token_supply ",pool_token_supply)

				let pool_lp_token_price;

				if (poolToken.name.toLowerCase().indexOf('usd') > -1) {
					console.log('usd');
					pool_lp_token_price = Number(virtualPrice);
				} else if (poolToken.name.toLowerCase().indexOf('btc') > -1) {
					console.log('btc');
					const { data } = await getCurrentBtcPrice();
					pool_lp_token_price = Number(virtualPrice) * data[0].current_price;
				} else if (poolToken.name.toLowerCase().indexOf('eth') > -1) {
					console.log('eth');
					const { data } = await getCurrentEthPrice();
					pool_lp_token_price = Number(virtualPrice) * data[0].current_price;
				} else {
					console.log(' No current value, skipping... ' + poolToken.name);
					continue;
				}

				console.log('LP Price ', pool_lp_token_price);

				let db_pool = await this.databaseService.getTokenByAddress(poolToken.id);
				console.log('db_pool ', db_pool);
				if (!db_pool.length) {
					const new_entity = await this.databaseService.addNewSushiTokenToDb(
						poolToken.id,
						name,
						name,
						PLATFORM,
						'CURVE',
						current_platfrom_id,
					);

					db_pool = await this.databaseService.getTokenByAddress(poolToken.id);
				}

				await this.databaseService.addOnePrice(
					db_pool[0]['id'],
					toTimestamp(new Date()),
					pool_lp_token_price,
					current_currency_id,
				);
			}
		} catch (e) {
			console.log(e);
		}
		console.log('Jot current curve prices done!');
		done();
	}

	public crawl_new_tokens_history = async (job: any, done: any): Promise<void> => {
		const current_currency_id = await this.databaseService.getCurrentCurrency();
		if (!current_currency_id) {
			throw 'No current currency in DB: ' + CURRENCY;
		}

		const current_platfrom_id = await this.databaseService.getCurrentPlatform();
		if (!current_platfrom_id) {
			throw 'No current platform in DB: ' + PLATFORM;
		}

		const db_assets = await this.databaseService.getNewTokensByResource('CURVE');
		console.log('starting uniswap history clawler');

		const first_tx_data = await this.theGraphService.getCurvefirstTxTimestamp();
		const first_timestamp = parseInt(first_tx_data['data']['data']['transactions'][0]['timestamp']);
		console.log('first_tx_data ', first_tx_data['data']['data']['transactions']);

		const current_day_ts = Math.round(Date.now() / 1000);
		const secondsInDay = 86400;

		console.log(' current_day_ts ', current_day_ts);

		for (let i = 0; i < db_assets.length; i++) {
			let day_num = 0,
				check_day_ts = getNextDayStart(first_timestamp);
			console.log('check_day_ts ', check_day_ts);
			let prices_count = 0;
			do {
				const first_day_block_query = await this.theGraphService.getCurvefirstBlockQuery(
					check_day_ts,
				);
				const block_number = first_day_block_query['data']['data']['blocks'][0]['block'];
				console.log('block_number ', block_number);

				const daily_price_query = await this.theGraphService.getCurveDailyBlockPricesQuery(
					parseInt(block_number),
					db_assets[i]['address'],
				);
				//console.log(daily_price_query['data']['data']['pools'][0])

				if (daily_price_query['data']['data']['pools'].length) {
					const { virtualPrice, name, id, poolToken } = daily_price_query['data']['data'][
						'pools'
					][0];

					let pool_lp_token_price;

					if (poolToken.name.toLowerCase().indexOf('usd') > -1) {
						console.log('usd');
						pool_lp_token_price = Number(virtualPrice);
					} else if (poolToken.name.toLowerCase().indexOf('btc') > -1) {
						console.log('btc');
						const {
							data: { prices },
						} = await getCoinHistoricalRangePrices(
							http,
							'bitcoin',
							check_day_ts,
							check_day_ts + secondsInDay,
						);

						console.log('hist BTC price ', prices);
						pool_lp_token_price = Number(virtualPrice) * prices[0][1];
					} else if (poolToken.name.toLowerCase().indexOf('eth') > -1) {
						console.log('eth');
						try {
							const {
								data: { prices },
							} = await getCoinHistoricalRangePrices(
								http,
								'ethereum',
								check_day_ts,
								check_day_ts + secondsInDay,
							);
							console.log('hist ETH price ', prices);
							pool_lp_token_price = Number(virtualPrice) * prices[0][1];
						} catch (e) {
							console.log(e);
						}
					} else {
						console.log(' No current value, skipping... ' + poolToken.name);
						day_num++;
						continue;
					}

					console.log('LP Price ', pool_lp_token_price);
					try {
						console.log(
							db_assets[i]['id'] +
								' ' +
								check_day_ts +
								' ' +
								pool_lp_token_price +
								' ' +
								current_currency_id,
						);
						await this.databaseService.addOnePrice(
							db_assets[i]['id'],
							check_day_ts,
							pool_lp_token_price,
							current_currency_id,
						);
					} catch (e) {
						console.log(e);
					}
					console.log('added new price');
					prices_count++;
				}

				day_num++;
				console.log(check_day_ts);
				check_day_ts = getNextDayStart(first_timestamp, day_num);
			} while (check_day_ts < current_day_ts);

			if (prices_count) {
				await this.databaseService.setAssetAsNotNew(db_assets[i]['id']);
				console.log('Updated pool ' + db_assets[i]['id'] + ' to OLD from NEW');
			}
		}

		done();
	};
}

const getNextDayStart = (ts: number, day = 0) => {
	const secondsInDay = 86400;
	const dayId = Math.round(ts / secondsInDay);
	return (dayId + day) * secondsInDay;
};
