import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../Logger/Logger.service';
import { CurrentPricesPayload, PriceResponseDto } from '../balance/dto/price.response.dto';
import { CHAIN_ID_ETH, ETH_BNB_ADDRESS, WETH_ADDRESS } from '../utils/utils';

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;
    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;
  }

  async getTokenPrices(
    addressesArray: string[],
    chain: number,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    if (chain === CHAIN_ID_ETH) {
      addressesArray.push(WETH_ADDRESS.toLowerCase());
    }
    addressesArray.push(ETH_BNB_ADDRESS.toLowerCase());

    const addresses = await addressesArray.join(',');

    let result;
    try {
      this.logger.time(this.getPricesUrl);
      result = await this.httpService
        .get<PriceResponseDto<CurrentPricesPayload>>(this.getPricesUrl, {
          params: {
            chain,
            addresses,
          },
        })
        .pipe(map((response) => response.data))
        .toPromise();

      this.logger.timeEnd(this.getPricesUrl);
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      this.logger.error(e);
      // TODO: do we need 0 if error? it's tricky
      const pricePayload: CurrentPricesPayload = {};

      addressesArray.forEach((item) => {
        pricePayload[`${item}`] = 0;
      });
      return { chain: undefined, currency: undefined, prices: pricePayload };
    }
    return result;
  }
}
