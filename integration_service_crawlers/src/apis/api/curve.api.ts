import { HttpService, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CurveApi {
	protected apiUrl: string;

	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService
	) {
		this.apiUrl = this.configService.get<string>('CURVE_API_URL')
	}

	async getApys(): Promise<any> {
		return this.httpService.get(this.apiUrl.concat('raw-stats/apys.json'))
			.pipe(map(response => response.data))
			.toPromise()
	}
}
