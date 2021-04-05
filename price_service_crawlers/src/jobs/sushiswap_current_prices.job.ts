import { Inject, Injectable } from '@nestjs/common';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { CURRENCY, PLATFORM } from '../utils/constants';

// TODO: clean file
export type TokenPrices = { [key: string]: { value: number; db_id: any } };

@Injectable()
export class SushiswapCurrentPricesJob {
	constructor(
		@Inject(NEST_PGPROMISE_CONNECTION)
		public pg: IDatabase<any>,
		private databaseService: DatabaseService,
		private theGraphService: Api,
	) {}

	public async crawl(job: any, done: any): Promise<void> {
		console.info('Current SUSHI Prices Job Sarted');
		try {
			const current_platfrom_id = await this.databaseService.getCurrentPlatform();
			if (!current_platfrom_id) throw 'No current platform in DB: ' + PLATFORM;

			const current_currency_id = await this.databaseService.getCurrentCurrency();
			if (!current_currency_id) throw 'No current currency in DB: ' + CURRENCY;

			const db_assets = await this.databaseService.getSushiTokens();

			if (db_assets.length) {
				const results: any = {};

				for (let i = 0; i < db_assets.length; i++) {
					console.info(db_assets[i]['address']);
					const one_results = await this.theGraphService.getCurrentSushiTokenPrices(
						db_assets[i]['address'],
					);

					if (one_results['data']['data']['dataPairs'].length) {
						const { reserveUSD, totalSupply } = one_results['data']['data']['dataPairs'][0];

						//console.info("reserveUSD "+reserveUSD+" totalSupply "+totalSupply+" res ",(Number(reserveUSD) / Number(totalSupply)))
						results[db_assets[i]['address']] = {
							db_id: db_assets[i]['id'],
							value:
								Number(reserveUSD) === 0 || Number(totalSupply) === 0
									? 0
									: Number(reserveUSD) / Number(totalSupply),
						};
					}
				}

				await this.databaseService.addHourlyPricesToDb(results, current_currency_id);
			}
		} catch (e) {
			console.error(e);
		}
		console.info('Add Current SUSHI Prices Job done');
		done();
	}
}

// const getEthPrice = async (): Promise<number> => {
// 	const { data } = await getCurrentEthPrice();
// 	return data[0].current_price;
// };
