import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ERC20Token, RequestErrorHandler } from '@app/common';
import { ChainIdEnum, CurrencyId, Address } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';
import { ETH_BNB_ADDRESS } from '@app/common/constant';

import {
  CurrentPricesPayload,
  HistoricalPrices,
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
import { isEthChain } from '../utils/web3';
import {
  CurrentTokensPricesDto,
  FetchPricesRequestDto,
  FetchTimestampPricesRequestDto,
  PriceCurrentRequestDto,
} from './price.dto';
import { CurrentPricesPayloadNew, PriceServiceResponse } from './price.interfaces';

function changeTokenArray(fromArray: ERC20Token[], toArray: string[]): void {
  fromArray.forEach((token) => toArray.push(token.address));
}

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;
  private readonly getNonLpTokensUrl: string;
  private readonly getBatchPriceUrl: string;
  private readonly fetchPricesUrl: string;
  private readonly fetchTimestampPricesUrl: string;

  private static addressArrayToStringInternal(addresses: string[], chain: ChainIdEnum): void {
    if (isEthChain(chain)) {
      changeTokenArray(NO_DB_ETH_TOKENS, addresses);
    } else {
      changeTokenArray(NO_DB_BNB_TOKENS, addresses);
    }
  }

  private static addressArrayToStringExternal(addresses: string[], chain: ChainIdEnum): void {
    if (isEthChain(chain)) {
      changeTokenArray(NO_SCAN_ETH_TOKENS, addresses);
    } else {
      changeTokenArray(NO_SCAN_BNB_TOKENS, addresses);
    }
    addresses.push(ETH_BNB_ADDRESS.toLowerCase());
  }

  private static filterHistoricalNonLpTokensAndFormat(
    pricesResp: PricesDto,
  ): PriceResponseDto<HistoricalPricesMap> {
    const prices = Object.entries(pricesResp.prices);
    const resultPrices = new Map<string, HistoricalPrices>();
    prices.forEach(([address, priceData]) => {
      resultPrices.set(address, priceData);
    });
    return new PriceResponseDto<HistoricalPricesMap>(
      pricesResp.chain,
      pricesResp.currency,
      resultPrices, // TODO TBD? Object.fromEntries(resultPrices),
    );
  }

  private static mapAddressArray(addresses: string[], chain: ChainIdEnum, internal?: number): void {
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
    this.fetchTimestampPricesUrl = `${url}/${getPricesPath}/timestamp`;
    this.fetchPricesUrl = `${url}/${getPricesPath}/fetch`;
  }

  async getTokenPricesWithLp(
    addressesArray: Address[],
    chain: ChainIdEnum,
    internal?: number,
  ): Promise<PriceResponseDto<CurrentPricesPayloadNew>> {
    // TODO: do we need this?
    PriceService.mapAddressArray(addressesArray, chain, internal);

    const request = new PriceCurrentRequestDto(addressesArray, chain, undefined);

    try {
      this.logger.time(this.getPricesUrl);
      const result = await this.httpService
        .post(this.getPricesUrl, request)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(this.getPricesUrl);
      return result;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      this.logger.error(e);
      // TODO: do we need 0 if error? it's tricky
      const pricePayload: CurrentPricesPayloadNew = {};

      addressesArray.forEach((item) => {
        pricePayload[`${item}`] = new CurrentTokensPricesDto();
      });
      return new PriceResponseDto<CurrentPricesPayloadNew>(undefined, undefined, pricePayload);
    }
  }

  async fetchTokenPrices(
    addressesArray: Address[],
    chain: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    PriceService.mapAddressArray(addressesArray, chain);

    const request = new FetchPricesRequestDto(addressesArray, chain);

    try {
      this.logger.time(this.fetchPricesUrl);

      const response: PriceServiceResponse<CurrentPricesPayload> = await this.httpService
        .post(this.fetchPricesUrl, request)
        .pipe(map((response) => response.data))
        .toPromise();

      this.logger.timeEnd(this.fetchPricesUrl);

      return response;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      this.logger.error(e);
      // TODO: do we need 0 if error? it's tricky
      const pricePayload: CurrentPricesPayload = {};

      addressesArray.forEach((item) => {
        pricePayload[`${item}`] = 0;
      });
      return { prices: pricePayload };
    }
  }

  @RequestErrorHandler()
  async getBulkPriceAtTimestamp(
    tokens: Address[],
    chain: ChainIdEnum,
    timestamp: number,
    currency?: CurrencyId,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    this.logger.time(this.fetchTimestampPricesUrl);

    const request = new FetchTimestampPricesRequestDto(tokens, chain, timestamp, currency);

    const response: PriceServiceResponse<CurrentPricesPayload> = await this.httpService
      .post(this.fetchTimestampPricesUrl, request)
      .pipe(map((response) => response.data))
      .toPromise();

    this.logger.timeEnd(this.fetchTimestampPricesUrl);

    return response;
  }

  async getHistoricalPrices(
    assets,
    chainId: ChainIdEnum,
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
      const priceData = PriceService.filterHistoricalNonLpTokensAndFormat(prices);
      this.logger.timeEnd(`request: chain=${chainId} ${this.getBatchPriceUrl}`);
      return priceData;
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
