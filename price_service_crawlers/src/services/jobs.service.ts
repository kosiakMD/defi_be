import { Inject, Injectable } from '@nestjs/common';
import Agenda from 'agenda';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { BalancerFirstCheckJob } from '../jobs/balancer_first_check.job';
import { CoingeckoCurrentPricesJob } from '../jobs/coingecko_current_prices.job';
import { CoingeckoFirstCheckJob } from '../jobs/coingecko_first_check.job';
import { SushiswapCurrentPricesJob } from '../jobs/sushiswap_current_prices.job';
import { SushiSwapFirstCheckJob } from '../jobs/sushiswap_first_check.job';
import { UniswapCurrentPricesJob } from '../jobs/uniswap_current_prices.job';
import { UniSwapFirstCheckJob } from '../jobs/uniswap_first_check.job';
import { Api } from '../thegraph/api';
import {
	CURRENT_PRICE_SECONDS_INTERVAL,
	NEW_TOKENS_HISTORY_SECONDS_INTERVAL,
	NEW_TOKENS_SECONDS_INTERVAL,
} from '../utils/constants';
import { DatabaseService } from './database.service';

// NOTE: We are limited to 10 bu to be safe we do 6
//

@Injectable()
export class JobsService {
	private agenda;

	constructor(
		@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
		private coingeckoNewTokenCheckJob: CoingeckoFirstCheckJob,
		private databaseService: DatabaseService,
		private theGraphService: Api,
		private coingeckoCurrentPricesJob: CoingeckoCurrentPricesJob,
		private sushiswapCurrentPricesJob: SushiswapCurrentPricesJob,
		private sushiSwapNewTokenCheckJob: SushiSwapFirstCheckJob,
		private uniswapCurrentPricesJob: UniswapCurrentPricesJob,
		private uniSwapFirstCheckJob: UniSwapFirstCheckJob,
		private balancerFirstCheckJob: BalancerFirstCheckJob,
	) {
		const connectionString = 'mongodb://127.0.0.1/agenda';
		this.agenda = new Agenda({
			db: { address: connectionString },
			processEvery: '30 seconds',
		});

		this.agenda
			.on('ready', async () => {
				await this.agenda.start();
				await this.agenda.cancel({});

				// check for new tokens on API
				this.agenda.define(
					'CRAWL_COINGECKO_NEW_TOKENS',
					{ lockLifetime: 10000 },
					this.coingeckoNewTokenCheckJob.crawl_new_tokens.bind(this),
				);
				this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_COINGECKO_NEW_TOKENS', {});
				// get history for new tokens
				this.agenda.define(
					'CRAWL_COINGECKO_NEW_TOKENS_HISTORY',
					{ lockLifetime: 10000 },
					this.coingeckoNewTokenCheckJob.crawl_new_tokens_history.bind(this),
				);
				this.agenda.every(NEW_TOKENS_HISTORY_SECONDS_INTERVAL + ' seconds', 'CRAWL_COINGECKO_NEW_TOKENS_HISTORY', {});
				// get current token prices
				this.agenda.define(
					'CRAWL_COINGECKO_CURRENT_PRICE',
					{ lockLifetime: 10000 },
					this.coingeckoCurrentPricesJob.crawl.bind(this),
				);
				this.agenda.every(CURRENT_PRICE_SECONDS_INTERVAL + ' seconds', 'CRAWL_COINGECKO_CURRENT_PRICE', {});

				//SUSHI
				this.agenda.define(
					'CRAWL_SUSHI_NEW_TOKENS',
					{ lockLifetime: 10000 },
					this.sushiSwapNewTokenCheckJob.crawl_new_tokens.bind(this),
				);
				this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_SUSHI_NEW_TOKENS', {});

				this.agenda.define(
					'CRAWL_SUSHI_NEW_TOKENS_HISTORY',
					{ lockLifetime: 10000 },
					this.sushiSwapNewTokenCheckJob.crawl_new_tokens_history.bind(this),
				);
				this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_SUSHI_NEW_TOKENS_HISTORY', {});

				this.agenda.define(
					'CRAWL_SUSHI_CURRENT_PRICE',
					{ lockLifetime: 10000 },
					this.sushiswapCurrentPricesJob.crawl.bind(this),
				);
				this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_SUSHI_CURRENT_PRICE', {});

				//UNISWAP
				this.agenda.define(
					'CRAWL_UNISWAP_NEW_TOKENS',
					{ lockLifetime: 10000 },
					this.uniSwapFirstCheckJob.crawl_new_tokens.bind(this),
				);
				this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_UNISWAP_NEW_TOKENS', {});

				this.agenda.define(
					'CRAWL_UNISWAP_NEW_TOKENS_HISTORY',
					{ lockLifetime: 10000 },
					this.uniSwapFirstCheckJob.crawl_new_tokens_history.bind(this),
				);
				this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_UNISWAP_NEW_TOKENS_HISTORY', {});

				this.agenda.define(
					'CRAWL_UNISWAP_CURRENT_PRICE',
					{ lockLifetime: 10000 },
					this.uniswapCurrentPricesJob.crawl.bind(this),
				);
				this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL + ' seconds', 'CRAWL_UNISWAP_CURRENT_PRICE', {});

				this.agenda.define(
					'CRAWL_BALANCER_NEW_TOKENS',
					{ lockLifetime: 10000 },
					this.balancerFirstCheckJob.crawl_new_tokens.bind(this),
				);
				//this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL+" seconds", 'CRAWL_BALANCER_NEW_TOKENS', {});
			})
			.on('error', (e) => console.error('Agenda connection error!', e));

		//this.agenda.start();
	}
}
