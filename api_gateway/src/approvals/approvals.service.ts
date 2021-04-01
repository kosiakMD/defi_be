import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ContractApproval } from '../interfaces';

@Injectable()
export class ApprovalsService {
	private readonly gas_url: string;

	constructor(private httpService: HttpService, private configService: ConfigService) {
		const url = this.configService.get<string>('DEFIYIELD_INFO_MAIN_URL');
		const path = this.configService.get<string>('APPROVALS_PATH');

		this.gas_url = `${url}/${path}`;
	}

	async getAll(address: Address): Promise<ContractApproval[]> {
		try {
			const get = this.httpService.get(`${this.gas_url}/${address}`);
			const promise = get.toPromise();
			console.time(this.gas_url);
			const result = await promise;
			console.timeEnd(this.gas_url);
			const { data } = result;
			return data;
		} catch (e) {
			console.error('er', e.message);
			throw e;
		}
	}
}
