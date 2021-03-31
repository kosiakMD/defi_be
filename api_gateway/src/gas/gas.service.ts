import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GasHistory, GasPrice } from '../interfaces';

interface GasServiceResponse {
	code: number;
	data: GasPrice;
}

@Injectable()
export class GasService {
	private readonly gas_current_url: string;
	private readonly gas_history_url: string;

	constructor(private httpService: HttpService, private configService: ConfigService) {
		const current_url = this.configService.get<string>('GAS_API_URL');
		const current_path = this.configService.get<string>('GAS_CURRENT_PATH');
		this.gas_current_url = `${current_url}/${current_path}`;

		const history_url = this.configService.get<string>('DEFIYIELD_INFO_2_URL');
		const history_path = this.configService.get<string>('GAS_HISTORY_PATH');
		this.gas_history_url = `${history_url}/${history_path}`;
	}

	async getGasCurrent(): Promise<GasServiceResponse> {
		try {
			const get = this.httpService.get(this.gas_current_url);
			const promise = get.toPromise();
			console.time(this.gas_current_url);
			const result = await promise;
			console.timeEnd(this.gas_current_url);
			const {
				data: { data },
			} = result;
			return data;
		} catch (e) {
			console.error('er', e);
			throw e;
		}
	}

	async getGasHistory(): Promise<GasHistory[]> {
		try {
			const get = this.httpService.get(this.gas_history_url);
			const promise = get.toPromise();
			console.time(this.gas_history_url);
			const result = await promise;
			console.timeEnd(this.gas_history_url);
			const { data } = result;
			return data;
		} catch (e) {
			console.error('er', e);
			throw e;
		}
	}
}
