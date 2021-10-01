import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../../Logger/Logger.service';
import { AlpacaApiResponse } from '../alpaca.interfaces';

@Injectable()
export class AlpacaApiService {
  private alpacaApiUrl;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {
    this.alpacaApiUrl = this.configService.get<string>('ALPACA_API_URL');
  }
  async getLeverageFarmingData(owner: string): Promise<AlpacaApiResponse[]> {
    const response = await this.httpService
      .get(this.alpacaApiUrl, { params: { owner: owner } })
      .pipe(map((response) => response.data))
      .toPromise();
    return response.data.positions;
  }
}
