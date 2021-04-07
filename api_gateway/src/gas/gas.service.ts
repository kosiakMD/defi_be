import { HttpService, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { GasHistory, GasPrice } from '../common/interfaces';

interface GasServiceResponse {
	code: number;
	data: GasPrice;
}

@Injectable()
export class GasService {
	private readonly gasCurrentUrl: string;
	private readonly gasHistoryUrl: string;

	constructor(
		private httpService: HttpService,
		private configService: ConfigService,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
	) {
		const curEntUrl = this.configService.get<string>('GAS_API_URL');
		const currentPath = this.configService.get<string>('GAS_CURRENT_PATH');
		this.gasCurrentUrl = `${curEntUrl}/${currentPath}`;

		const hisOryUrl = this.configService.get<string>('DEFIYIELD_INFO_2_URL');
		const historyPath = this.configService.get<string>('GAS_HISTORY_PATH');
		this.gasHistoryUrl = `${hisOryUrl}/${historyPath}`;
	}

	async getGasCurrent(): Promise<GasServiceResponse> {
		try {
			const get = this.httpService.get(this.gasCurrentUrl);
			const promise = get.toPromise();
			const start = new Date().getTime();
			const result = await promise;
			this.logger.log(new Date().getTime() - start, this.gasCurrentUrl);
			const {
				data: { data },
			} = result;
			return data;
		} catch (e) {
			this.logger.error('er', e);
			throw e;
		}
	}

	async getGasHistory(): Promise<GasHistory[]> {
		try {
			const get = this.httpService.get(this.gasHistoryUrl);
			const promise = get.toPromise();
			const start = new Date().getTime();
			const result = await promise;
			this.logger.log(new Date().getTime() - start, this.gasHistoryUrl);
			const { data } = result;
			return data;
		} catch (e) {
			this.logger.error('er', e);
			throw e;
		}
	}
}
