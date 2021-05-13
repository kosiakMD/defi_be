import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../Logger/Logger.service';
import { changeTokenArray } from '../balance/balance_util/balance.util';
import { CurrentPricesPayload, PriceResponseDto } from '../balance/dto/price.response.dto';
import {
  NO_DB_BNB_TOKENS,
  NO_DB_ETH_TOKENS,
  NO_SCAN_BNB_TOKENS,
  NO_SCAN_ETH_TOKENS,
} from '../balance/tokens/tokens';
import { CHAIN_ID_ETH, ETH_BNB_ADDRESS } from '../utils/utils';
import { PriceServiceResponse } from './price.interfaces';

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;
  private readonly getBatchPriceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;
    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}/v2`;
    this.getBatchPriceUrl = `${url}/${getPricesPath}/batch`;
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

      result = this.filterNonLpTokensAndFormat(result);
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

  filterNonLpTokensAndFormat(prices) {
    const result = {
      chain: prices.chain,
      currency: prices.currency,
      prices: {},
    };
    for (const address in prices.prices) {
      if (!prices.prices[address]['isLp']) {
        result.prices[address] = prices.prices[address].price;
      }
    }
    return result;
  }

  async getHistoricalPrices(assets, chainId: number): Promise<PriceServiceResponse> {
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
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      this.logger.error(e.message, 'getPrices');
      throw e;
    }
  }

  private mapAddressArray(addresses: string[], chain: number, internal?: number): void {
    internal
      ? this.addressArrayToStringInternal(addresses, chain)
      : this.addressArrayToStringExternal(addresses, chain);
  }

  private addressArrayToStringInternal(addresses: string[], chain: number): void {
    if (chain === CHAIN_ID_ETH) {
      changeTokenArray(NO_DB_ETH_TOKENS, addresses);
    } else {
      changeTokenArray(NO_DB_BNB_TOKENS, addresses);
    }
  }

  private addressArrayToStringExternal(addresses: string[], chain: number): void {
    if (chain === CHAIN_ID_ETH) {
      changeTokenArray(NO_SCAN_ETH_TOKENS, addresses);
    } else {
      changeTokenArray(NO_SCAN_BNB_TOKENS, addresses);
    }
    addresses.push(ETH_BNB_ADDRESS.toLowerCase());
  }
}
