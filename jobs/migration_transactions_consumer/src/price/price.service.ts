import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../logger/logger.service';
import { CurrentPrices, PriceResponseDto } from './dto/price.response.dto';

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;
  private readonly getBatchPriceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${Number(port) ? ':' + port : ''}`;
    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;
    this.getBatchPriceUrl = `${url}/${getPricesPath}/batch`;
  }

  async getHistoricalPrices(assets, chainId: number): Promise<PriceResponseDto<CurrentPrices>> {
    try {
      this.logger.time(`request: chain=${chainId} ${this.getBatchPriceUrl}`);
      const prices = await this.httpService
        .post(this.getBatchPriceUrl, {
          currency: 1,
          chain: chainId,
          assets: assets,
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: chain=${chainId} ${this.getBatchPriceUrl}`);
      return prices;
    } catch (e: any) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      this.logger.error(e.message, 'getHistoricalPrices');
      throw e;
    }
  }
}
