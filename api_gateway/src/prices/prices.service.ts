import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '../interfaces';
import { CurrentPrice, HistoricalPrice } from './prices.interface';

@Injectable()
export class PricesService {
	private readonly get_prices_url: string;
	private readonly get_history_url: string;

	constructor(private httpService: HttpService, private configService: ConfigService) {
		const host = this.configService.get<string>('PRICE_SERVICE_HOST');
		const port = this.configService.get<string>('PRICE_SERVICE_PORT');
		const url = `http://${host}:${port}`;

		const get_prices_path = this.configService.get<string>('PRICES_PATH');
		this.get_prices_url = `${url}/${get_prices_path}`;

		const history_path = this.configService.get<string>('GAS_HISTORY_PATH');
		this.get_history_url = `${url}/${history_path}`;
	}

	async getPrices(
		addresses: Address[],
		currencyId: number,
		platformId: number,
	): Promise<CurrentPrice> {
		try {
			const get = this.httpService.get(this.get_prices_url, {
				params: {
					addresses,
					currencyId,
					platformId,
				},
			});
			const promise = get.toPromise();
			console.time(this.get_prices_url);
			const result = await promise;
			console.timeEnd(this.get_prices_url);
			const { data } = result;
			return data;
		} catch (e) {
			console.error(e);
			throw e.message;
		}
	}

	async getHistorical(
		addresses: Address,
		timestamps: string[],
		currencyId: number,
		platformId: number,
	): Promise<HistoricalPrice[]> {
		try {
			const get = this.httpService.get(this.get_history_url, {
				params: {
					addresses,
					timestamps,
					currencyId,
					platformId,
				},
			});
			const promise = get.toPromise();
			console.time(this.get_history_url);
			const result = await promise;
			console.timeEnd(this.get_history_url);
			const {
				data: { data },
			} = result;
			return data;
		} catch (e) {
			console.error(e);
			throw e;
		}
	}
}
