import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { getCurrentCoinPrices, getCurrentEthPrice } from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { isETH } from '../utils/common';
import { CURRENCY, ETH_ADDRESS, PLATFORM } from '../utils/constants';

export type TokenPrices = { [key: string]: { value: number; ['db_id']: any } };

const createAddressChunks = (addresses: any[]): string[][] => {
	let i, j, temparray;
	const chunk = 100;
	const result = [];
	for (i = 0, j = addresses.length; i < j; i += chunk) {
		temparray = addresses.slice(i, i + chunk);
		const dbTokenAddresses = temparray.map((token) => token['address']);
		result.push(dbTokenAddresses);
	}
	return result;
};

@Injectable()
export class CoingeckoCurrentPricesJob {
	static readonly ethAddress = ETH_ADDRESS;

	constructor(
		@Inject(NEST_PGPROMISE_CONNECTION)
		public pg: IDatabase<any>,
		private databaseService: DatabaseService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
	) {}

	static getEthPrice = async (): Promise<number> => {
		const { data } = await getCurrentEthPrice();
		return data[0].currentPrice;
	};

	static getCurrentTokenPrices = async (tokens: string[]): Promise<TokenPrices> => {
		if (!tokens.length) {
			return {};
		}
		const response: TokenPrices = {};

		// NOTE: Special handling of ETH
		if (tokens.includes(CoingeckoCurrentPricesJob.ethAddress)) {
			response[CoingeckoCurrentPricesJob.ethAddress] = {
				value: await CoingeckoCurrentPricesJob.getEthPrice(),
				['db_id']: null,
			};
		}

		const addresses = tokens.filter((token) => !isETH(token)).join(',');
		const { data } = await getCurrentCoinPrices(addresses);

		return Object.keys(data).reduce(
			(response, key) => ({
				...response,
				[key]: { value: data[key].usd, ['db_id']: null },
			}),
			response,
		);
	};

	public async crawl(job: any, done: any): Promise<void> {
		this.logger.log('Current Prices Job Sarted');
		try {
			const currentPlatfromId = await this.databaseService.getCurrentPlatform();
			if (!currentPlatfromId) throw 'No current platform in DB: ' + PLATFORM;

			const currentCurrencyId = await this.databaseService.getCurrentCurrency();
			if (!currentCurrencyId) throw 'No current currency in DB: ' + CURRENCY;

			const dbAssets = await this.databaseService.getTokensByPlatform(currentPlatfromId);

			if (dbAssets.length) {
				const dbTokenAddressesChunks = createAddressChunks(dbAssets);
				//NOTE: request str is too big, making chunks
				let results: any = {};
				for (let i = 0; i < dbTokenAddressesChunks.length; i++) {
					const chunkResults = await CoingeckoCurrentPricesJob.getCurrentTokenPrices(
						dbTokenAddressesChunks[i],
					);
					results = Object.assign(results, chunkResults);
				}

				for (let i = 0; i < dbAssets.length; i++) {
					if (results[dbAssets[i]['address']]) {
						results[dbAssets[i]['address']]['db_Id'] = dbAssets[i]['id'];
					}
				}
				await this.databaseService.addHourlyPricesToDb(results, currentCurrencyId);
			}
		} catch (e) {
			this.logger.error(e);
		}
		this.logger.log('Add Current Prices Job done');
		done();
	}
}
