import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Token } from '../interfaces';

@Injectable()
export class TokensService {
	private readonly tokens_url: string;

	constructor(private httpService: HttpService, private configService: ConfigService) {
		const url = this.configService.get<string>('DEFIYIELD_INFO_2_URL');
		const path = this.configService.get<string>('TOKENS_PATH');

		this.tokens_url = `${url}/${path}`;
	}

	async getAll(): Promise<Token[]> {
		try {
			const get = this.httpService.get(this.tokens_url);
			const promise = get.toPromise();
			console.time(this.tokens_url);
			const result = await promise;
			console.timeEnd(this.tokens_url);
			const { data } = result;
			return data;
		} catch (e) {
			console.error('er', e);
			throw e;
		}
	}
}
