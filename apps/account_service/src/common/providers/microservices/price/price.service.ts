import { map, tap } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ERC20Token } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';
import { ETH_BNB_ADDRESS } from '@app/common/constant';

import {
  NO_DB_BNB_TOKENS,
  NO_DB_ETH_TOKENS,
  NO_SCAN_BNB_TOKENS,
  NO_SCAN_ETH_TOKENS,
} from '../../../constant/tokens';
import { isEthChain } from '../../../utils/web3';
import {
  FetchPricesRequestDto,
} from './dto/price.dto';
import {
  CurrentPricesPayload,
  HistoricalPrices,
  HistoricalPricesMap,
  PriceResponseDto,
  PricesDto,
} from './dto/price.response.dto';

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

  private static mapAddressArray(addresses: string[], chain: number, internal?: number): void {
    internal
      ? PriceService.addressArrayToStringInternal(addresses, chain)
      : PriceService.addressArrayToStringExternal(addresses, chain);
  }

  constructor(
    // @Inject('HttpService')
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


  // TODO: replace this one with assetsService when NATIVE assets are done. It's used only in delegations.
  async fetchTokenPrices(
    addressesArray: Address[],
    chain: number,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    PriceService.mapAddressArray(addressesArray, chain);

    const request = new FetchPricesRequestDto(addressesArray, chain);
    const timerKey = `${this.fetchPricesUrl} Chain: ${chain}`;

    try {
      this.logger.time(timerKey);

      return await this.httpService
        .post(this.fetchPricesUrl, request)
        .pipe(
          tap({
            next: () => this.logger.timeEnd(timerKey),
            error: () => this.logger.timeEnd(timerKey),
          }),
          map((response) => response.data),
        )
        .toPromise();
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
}
