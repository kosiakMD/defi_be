import { Inject, Injectable, LoggerService } from '@nestjs/common';
import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { getCoinRangePrices, getCoins } from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { toTimestamp } from '../utils/common';
import { CURRENCY, PLATFORM, TEST_TOKENS } from '../utils/constants';
import { crawlCoin } from '../utils/crawlCoin';

const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });
export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };

const tokens: string[] = TEST_TOKENS;

const getEtherTokens = async (): Promise<TokenPrices> => {
	if (!tokens.length) {
		return {};
	}
	const { data } = await getCoins();
	return data;
};

@Injectable()
export class CoingeckoFirstCheckJob {
	constructor(
		@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
		private databaseService: DatabaseService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
	) {}

	public async crawlNewTokens(job: any, done: any): Promise<void> {
		try {
			const currentPlatfromId = await this.databaseService.getCurrentPlatform();
			if (!currentPlatfromId) {
				throw 'No current platform in DB: ' + PLATFORM;
			}

			const dbAssets = await this.databaseService.getAllTokens();
			const dbTokenAddresses = dbAssets.map((token) => token['address']);
			const remoteTokens = await getEtherTokens();

			for (let i = 0; i < remoteTokens.length; i++) {
				if (!remoteTokens[i]['platforms'] || !remoteTokens[i]['platforms'][PLATFORM]) {
					continue;
				}
				if (dbTokenAddresses.indexOf(remoteTokens[i]['platforms'][PLATFORM]) === -1)
					await this.databaseService.addNewTokenToDb(remoteTokens[i], currentPlatfromId);
			}
			this.logger.log('Add new tokens Job done');
		} catch (e) {
			this.logger.error(e);
		}
		done();
	}

	public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
		const currentCurrencyId = await this.databaseService.getCurrentCurrency();
		if (!currentCurrencyId) {
			throw 'No current currency in DB: ' + CURRENCY;
		}

		const dbAssets = await this.databaseService.getNewTokens();

		for (const coin of dbAssets) {
			try {
				const {
					data: { prices },
				} = await getCoinRangePrices(
					http,
					coin.address,
					toTimestamp(new Date(2013)),
					toTimestamp(new Date()),
				);

				const result = await crawlCoin(
					coin.id,
					coin,
					prices,
					currentCurrencyId,
					this.databaseService,
					this.logger,
					'coingecko',
				);
				if (!result) break;
			} catch (err) {
				this.logger.error(err, `Token ${coin.id} price checking error`);
				break;
			}
		}
		done();
	};
}
