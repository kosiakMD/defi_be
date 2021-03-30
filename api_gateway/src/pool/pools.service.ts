import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Pool } from '../interfaces';

@Injectable()
export class PoolsService {
	private readonly pools_url: string;

	constructor(private httpService: HttpService, private configService: ConfigService) {
		const url = this.configService.get<string>('POOLS_SERVICE_URL');
		const path = this.configService.get<string>('POOLS_PATH');

		this.pools_url = `${url}/${path}`;
	}

	async getAll(): Promise<Pool[][]> {
		try {
			const get = this.httpService.get(this.pools_url);
			const promise = get.toPromise();
			console.time(this.pools_url);
			const result = await promise;
			console.timeEnd(this.pools_url);
			const { data } = result;
			return data;
		} catch (e) {
			console.error('er', e);
			throw e;
		}
	}
}
