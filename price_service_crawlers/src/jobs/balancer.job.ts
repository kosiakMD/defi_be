import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { getCoinRangePrices, getCoins } from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { toTimestamp } from '../utils/common';
import { CURRENCY, PLATFORM, TEST_TOKENS } from '../utils/constants';

const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });

export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };

const tokens: string[] = TEST_TOKENS;

@Injectable()
export class CoingeckoFirstCheckJob {
	constructor(@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>, private databaseService: DatabaseService) {}

	public async crawl_balancer_pools(job: any, done: any): Promise<void> {
		try {
			const current_platfrom_id = await this.databaseService.getCurrentPlatform();
			if (!current_platfrom_id) {
				throw 'No current platform in DB: ' + PLATFORM;
			}

			const db_assets = await this.databaseService.getAllTokens();
			const db_token_addresses = db_assets.map((token) => token['address']);
			const remote_tokens = await getEtherTokens();

			for (let i = 0; i < remote_tokens.length; i++) {
				if (!remote_tokens[i]['platforms'] || !remote_tokens[i]['platforms'][PLATFORM]) {
					continue;
				}
				if (db_token_addresses.indexOf(remote_tokens[i]['platforms'][PLATFORM]) === -1)
					await this.databaseService.addNewTokenToDb(remote_tokens[i], current_platfrom_id);
			}
			console.info('Add new tokens Job done');
		} catch (e) {
			console.error(e);
		}
		done();
	}

	public crawl_new_tokens_history = async (job: any, done: any): Promise<void> => {
		const current_currency_id = await this.databaseService.getCurrentCurrency();
		if (!current_currency_id) {
			throw 'No current currency in DB: ' + CURRENCY;
		}

		const db_assets = await this.databaseService.getNewTokens();

		for (const coin of db_assets) {
			try {
				const result = await crawlCoin(coin.id, coin, current_currency_id, this.databaseService);
				if (!result) break;
			} catch (err) {
				console.error(`Token ${coin.id} price checking error`, err);
				break;
			}
		}
		done();
	};
}

async function crawlCoin(coin_id, coin, currency_id, db) {
	if (!coin.address) {
		console.info(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
		return;
	}

	const {
		data: { prices },
	} = await getCoinRangePrices(http, coin.address, toTimestamp(new Date(2013)), toTimestamp(new Date()));

	console.info(`${prices.length} prices found`);
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

const getEtherTokens = async (): Promise<TokenPrices> => {
	if (!tokens.length) {
		return {};
	}
	const { data } = await getCoins();
	return data;
};
