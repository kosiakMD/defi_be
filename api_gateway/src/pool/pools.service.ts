import { HttpService, Injectable, OnModuleInit } from '@nestjs/common';

import { Pool } from '../interfaces';

@Injectable()
export class PoolsService implements OnModuleInit {
	private pools_url: string;
	onModuleInit = (): void => {
		const { POOLS_SERVICE, POOLS_PATH } = process.env;
		this.pools_url = `${POOLS_SERVICE}/${POOLS_PATH}`;
	};

	constructor(private httpService: HttpService) {}

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
