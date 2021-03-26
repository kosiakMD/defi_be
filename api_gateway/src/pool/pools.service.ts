import { HttpService, Injectable } from '@nestjs/common';
import { Pool } from '../interfaces';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';

const POOL_SERVER = 'https://dashdevapi.defiyield.info';
const POOL_PATH = '/pools';
const POOL_URL = POOL_SERVER + POOL_PATH;

@Injectable()
export class PoolsService {
	constructor(private httpService: HttpService) {
	}

	getAll(): Observable<AxiosResponse<Pool[]>> {
		try {
			const r = this.httpService.get(POOL_URL);
			console.log(r);
			return r;
		} catch (e) {
			console.error('er', e);
			throw e;
		}
	}
}
