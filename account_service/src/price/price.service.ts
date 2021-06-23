import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../Logger/Logger.service';
import { changeTokenArray } from '../balance/balance_util/balance.util';
import {
  CurrentPricesPayload,
  HistoricalPricesMap,
  PriceResponseDto,
  PricesDto,
} from '../balance/dto/price.response.dto';
import {
  NO_DB_BNB_TOKENS,
  NO_DB_ETH_TOKENS,
  NO_SCAN_BNB_TOKENS,
  NO_SCAN_ETH_TOKENS,
} from '../balance/tokens/tokens';
import { ETH_BNB_ADDRESS } from '../common/constatnt';
import { Address } from '../common/interfaces';
import { ChainId, Timestamp } from '../common/types';
import { isEthChain } from '../utils/web3';
import { PriceCurrentRequestDto, PriceHistoricalRequestDto } from './price.dto';
import { PriceServiceResponse } from './price.interfaces';

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;
  private readonly getNonLpTokensUrl: string;
  private readonly getBatchPriceUrl: string;

  private static addressArrayToStringInternal(addresses: string[], chain: number): void {
    if (isEthChain(chain)) {
      changeTokenArray(NO_DB_ETH_TOKENS, addresses);
    } else {
      changeTokenArray(NO_DB_BNB_TOKENS, addresses);
    }
  }

  private static addressArrayToStringExternal(addresses: string[], chain: number): void {
    if (isEthChain(chain)) {
      changeTokenArray(NO_SCAN_ETH_TOKENS, addresses);
    } else {
      changeTokenArray(NO_SCAN_BNB_TOKENS, addresses);
    }
    addresses.push(ETH_BNB_ADDRESS.toLowerCase());
  }

  private static filterNonLpTokensAndFormat(prices): PriceResponseDto<CurrentPricesPayload> {
    const result = {
      chain: prices.chain,
      currency: prices.currency,
      prices: {},
    };
    for (const address in prices.prices) {
      if (!prices.prices[address].isLp) {
        result.prices[address] = prices.prices[address].price;
      }
    }
    return result;
  }

  private static filterHistoricalNonLpTokensAndFormat(
    pricesResp: PricesDto,
  ): PriceResponseDto<HistoricalPricesMap> {
    const resultPrices = new Map<string, HistoricalPricesMap>();
    const prices = Object.entries(pricesResp.prices);
    prices.forEach(([address, priceData]) => {
      if (!priceData.isLp) {
        resultPrices.set(address, priceData.prices);
      }
    });

    const result = new PriceResponseDto<HistoricalPricesMap>(
      pricesResp.chain,
      pricesResp.currency,
      resultPrices, // TODO TBD? Object.fromEntries(resultPrices),
    );
    return result;
  }

  private static mapAddressArray(addresses: string[], chain: number, internal?: number): void {
    internal
      ? PriceService.addressArrayToStringInternal(addresses, chain)
      : PriceService.addressArrayToStringExternal(addresses, chain);
  }

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
    this.getNonLpTokensUrl = `${url}/${getPricesPath}/nonLpTokens`;
    this.getBatchPriceUrl = `${url}/${getPricesPath}/batch`;
  }

  async getTokenPrices(
    addressesArray: Address[],
    chain: ChainId,
    internal?: number,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    // TODO: do we need this?
    PriceService.mapAddressArray(addressesArray, chain, internal);

    const request = new PriceCurrentRequestDto(addressesArray, chain, undefined);

    let result;
    try {
      this.logger.time(this.getPricesUrl);
      const priceResult: PricesDto = await this.httpService
        .post(this.getPricesUrl, request)
        .pipe(map((response) => response.data))
        .toPromise();

      result = PriceService.filterNonLpTokensAndFormat(priceResult);
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

  public async getTokenHistoricalPrices(
    addressesArray: Address[],
    timestamps: Timestamp[],
    chainId: ChainId,
    // internal = 1,
  ): Promise<PriceResponseDto<HistoricalPricesMap>> {
    const timeMark = `${this.getPricesUrl} chainId:${chainId}`;
    try {
      // TODO: do we need this?
      // PriceService.mapAddressArray(addressesArray, chainId, internal);

      const request = new PriceHistoricalRequestDto(addressesArray, timestamps, chainId, undefined);

      this.logger.time(timeMark);
      const priceResult: PricesDto = await this.httpService
        .post(this.getPricesUrl, request)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(timeMark);

      const priceData = PriceService.filterHistoricalNonLpTokensAndFormat(priceResult);
      return priceData;
    } catch (e) {
      this.logger.timeEnd(timeMark);
      e.response
        ? this.logger.error(e.response.data, 'getTokenHistoricalPrices')
        : this.logger.error(e, 'getTokenHistoricalPrices');
      throw e;
    }
  }

  async getNonLpTokens(): Promise<string[]> {
    let result;
    try {
      this.logger.time(this.getPricesUrl);
      result = await this.httpService
        .post(this.getNonLpTokensUrl, {})
        .pipe(map((response) => response.data))
        .toPromise();
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      this.logger.error(e, 'getNonLpTokens');
    }
    return result || [];
  }

  async getHistoricalPrices(
    assets,
    chainId: number,
  ): Promise<PriceServiceResponse<HistoricalPricesMap>> {
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
}
