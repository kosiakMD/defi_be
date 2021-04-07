import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { Asset } from '../common/interfaces';
import { CurrentPrice, HistoricalPrice } from './prices.interface';

@Injectable()
export class PricesService {
	private readonly getPricesUrl: string;
	private readonly getHistoryUrl: string;

	constructor(
		private httpService: HttpService,
		private configService: ConfigService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
	) {
		const host = this.configService.get<string>('PRICE_SERVICE_HOST');
		const port = this.configService.get<string>('PRICE_SERVICE_PORT');
		const url = `http://${host}:${port}`;

		const getPricesPath = this.configService.get<string>('PRICES_PATH');
		this.getPricesUrl = `${url}/${getPricesPath}`;

		const historyPath = this.configService.get<string>('PRICES_HISTORICAL_PATH');
		this.getHistoryUrl = `${url}/${historyPath}`;
	}

	async getPrices(
		addresses: Asset[],
		currencyId: number,
		platformId: number,
	): Promise<CurrentPrice> {
		try {
			const get = this.httpService.get(this.getPricesUrl, {
				params: {
					addresses,
					currencyId,
					platformId,
				},
			});
			const promise = get.toPromise();
			const start = new Date().getTime();
			this.logger.time('request: ' + this.getPricesUrl);
			const result = await promise;
			this.logger.timeEnd('request: ' + this.getPricesUrl);
			this.logger.log(new Date().getTime() - start, 'request: ' + this.getPricesUrl);
			const { data } = result;
			if (data.message) {
				throw new Error(data.message);
			} else {
				return data;
			}
		} catch (e) {
			this.logger.error(e.message);
			throw e;
		}
	}

	async getHistorical(
		tokens: Asset[],
		timestamps: string[],
		currencyId: number,
		platformId: number,
	): Promise<HistoricalPrice[]> {
		try {
			const get = this.httpService.post(this.getHistoryUrl, {
				body: {
					tokens,
					timestamps,
					currencyId,
					platformId,
				},
			});
			const promise = get.toPromise();
			this.logger.time(this.getHistoryUrl);
			const result = await promise;
			this.logger.timeEnd(this.getHistoryUrl);
			const {
				data: { data },
			} = result;
			return data;
		} catch (e) {
			this.logger.error(e);
			throw e;
		}
	}
}
