import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../Logger/Logger.service';
import { CurrentPricesPayload, PriceResponseDto } from '../balance/dto/price.response.dto';
import { NO_DB_ETH_TOKENS } from '../balance/tokens/tokens';
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
    internal?: number,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    this.mapAddressArray(addressesArray, chain, internal);

    const request = {
      chain: chain,
      currency: undefined,
      addresses: addressesArray,
    };

    let result;
    try {
      this.logger.time(this.getPricesUrl);
      result = await this.httpService
        .post(this.getPricesUrl, request)
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

  private mapAddressArray(addresses: string[], chain: number, internal?: number): void {
    internal
      ? this.addressArrayToStringInternal(addresses, chain)
      : this.addressArrayToStringExternal(addresses, chain);
  }

  private addressArrayToStringInternal(addresses: string[], chain: number): void {
    if (chain === CHAIN_ID_ETH) {
      NO_DB_ETH_TOKENS.forEach((token) => addresses.push(token.address));
    } else {
      addresses.push(ETH_BNB_ADDRESS.toLowerCase());
    }
  }

  private addressArrayToStringExternal(addresses: string[], chain: number): void {
    if (chain === CHAIN_ID_ETH) {
      addresses.push(WETH_ADDRESS.toLowerCase());
    }
    addresses.push(ETH_BNB_ADDRESS.toLowerCase());
  }
}
