import { HttpService, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Pool } from '../interfaces';

const POOL_SERVER = 'https://dashdevapi.defiyield.info';
const POOL_PATH = '/pools';
const POOL_URL = POOL_SERVER + POOL_PATH;

@Injectable()
export class PoolsService {
	constructor(private httpService: HttpService) {}

	async getAll(): Promise<Pool[]> {
		try {
			const now = Date.now();
			console.log('now', now);
			const get = this.httpService.get(POOL_URL);
			// get.pipe(
			// 	tap(() => {
			// 		console.log(Date.now() - now);
			// 	}),
			// );
			const promise = get.toPromise();
			console.log(Date.now() - now);
			console.log('promise', promise);
			const result = await promise;
			// console.log('result', result);
			const { data } = result;
			console.log('data', data);
			return data;
		} catch (e) {
			console.error('er', e);
			throw e;
		}
	}
}
