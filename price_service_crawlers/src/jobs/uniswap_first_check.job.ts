import { Inject, Injectable } from '@nestjs/common';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { CURRENCY, PLATFORM } from '../utils/constants';

// TODO: clean file
// const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });

export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };

// const tokens: string[] = TEST_TOKENS;

@Injectable()
export class UniSwapFirstCheckJob {
	constructor(
		@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
		private databaseService: DatabaseService,
		private theGraphService: Api,
	) {}

	public async crawl_new_tokens(job: any, done: any): Promise<void> {
		try {
			const current_platfrom_id = await this.databaseService.getCurrentPlatform();

			let tokens = [];
			if (!current_platfrom_id) {
				throw 'No current platform in DB: ' + PLATFORM;
			}
			console.info('request prepared');
			let iteration = 0;
			do {
				const tokenRequest = await this.theGraphService.getUniswapPoolsTokens(iteration);
				console.info('tokens ', tokenRequest);
				console.info('tokens ', tokenRequest['data']['data']['dataPairs']);
				tokens = tokenRequest['data']['data']['dataPairs'];

				console.log(tokens.length);
				const db_assets = await this.databaseService.getUniTokens();
				const db_token_addresses = db_assets.map((token) => token['address']);

				for (let i = 0; i < tokens.length; i++) {
					console.info(tokens[i]['id']);
					if (db_token_addresses.indexOf(tokens[i]['id']) === -1)
						await this.databaseService.addNewSushiTokenToDb(
							tokens[i]['id'],
							tokens[i]['token0']['name'] + '-' + tokens[i]['token1']['name'],
							tokens[i]['token0']['symbol'] + '-' + tokens[i]['token1']['symbol'],
							PLATFORM,
							'UNISWAP',
							current_platfrom_id,
						);
				}
				iteration++;
				console.log('tokens.length ', tokens.length);
			} while (iteration < 5 && tokens.length);
		} catch (e) {
			console.error(e);
		}

		console.log('ADD Uniswap job done');
		done();
	}

	public crawl_new_tokens_history = async (job: any, done: any): Promise<void> => {
		const current_currency_id = await this.databaseService.getCurrentCurrency();
		if (!current_currency_id) {
			throw 'No current currency in DB: ' + CURRENCY;
		}

		const db_assets = await this.databaseService.getNewTokensByResource('UNISWAP');
		console.info('starting uniswap history clawler');

		const first_tx_data = await this.theGraphService.getUniwapfirstTxTimestamp();
		const first_timestamp = parseInt(first_tx_data['data']['data']['transactions'][0]['timestamp']);
		console.info('first_tx_data ', first_tx_data['data']['data']['transactions']);

		const current_day_ts = Math.round(Date.now() / 1000);

		console.info(' current_day_ts ', current_day_ts);

		for (let i = 0; i < db_assets.length; i++) {
			let day_num = 0,
				check_day_ts = getNextDayStart(first_timestamp);
			console.info('check_day_ts ', check_day_ts);
			const prices = [];
			do {
				const first_day_block_query = await this.theGraphService.getUniswapfirstBlockQuery(
					check_day_ts,
				);
				const block_number = first_day_block_query['data']['data']['blocks'][0]['blockNumber'];
				console.info('block_number ', block_number);

				const daily_price_query = await this.theGraphService.getUniswapDailyBlockPricesQuery(
					parseInt(block_number),
					db_assets[i]['address'],
				);
				console.info(daily_price_query['data']['data']);
				if (daily_price_query['data']['data']['pairs'].length) {
					const { reserveUSD, totalSupply } = daily_price_query['data']['data']['pairs'][0];

					if (reserveUSD && totalSupply) {
						prices.push([
							check_day_ts,
							Number(reserveUSD) === 0 || Number(totalSupply) === 0
								? 0
								: Number(reserveUSD) / Number(totalSupply),
						]);
					}
				}

				day_num++;
				console.info(check_day_ts);
				check_day_ts = getNextDayStart(first_timestamp, day_num);
			} while (check_day_ts < current_day_ts);
			console.info('prices ', prices);
			await crawlCoin(
				db_assets[i].id,
				db_assets[i],
				prices,
				current_currency_id,
				this.databaseService,
			);
		}

		done();
	};
}

async function crawlCoin(coin_id, coin, prices, currency_id, db) {
	if (!coin.address) {
		console.info(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
		return;
	}

	console.info(`uniswap ${prices.length} prices found`);
	if (prices.length) {
		const tokenPrices = prices.map(([timestamp, price]) => ({
			id: coin.id,
			address: coin.address,
			timestamp: Math.round(timestamp / 1000),
			price: price,
			currency_id,
		}));

		return await db.saveTokenPrices(coin_id, tokenPrices);
	}
	return true;
}

const getNextDayStart = (ts: number, day = 0) => {
	const secondsInDay = 86400;
	const dayId = Math.round(ts / secondsInDay);
	return (dayId + day) * secondsInDay;
};
