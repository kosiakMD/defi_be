import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import {
  COIN_GECKO_250_MARKET_TOP_URL,
  COIN_GECKO_COIN_PRICE_URL,
  COIN_GECKO_COINS_LIST_URL,
  COIN_MARKET_CAP_API_KEY,
  COIN_MARKET_CAP_LIST_URL,
  USD,
} from '../constants/temporary-tokens.constants';
import {
  Coin,
  CoinGeckoSimplePrice,
  CoinMarketCapResponse,
  CoinsMarketsTop,
} from '../interfaces/temporary-tokens.interfaces';

@Injectable()
export class CoingeckoService {
  constructor(
    private httpService: HttpService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {}

  async get250MarketTop(): Promise<CoinsMarketsTop[]> {
    try {
      this.logger.time(`request: ${COIN_GECKO_250_MARKET_TOP_URL}`);
      const marketTop250 = await this.httpService
        .get(COIN_GECKO_250_MARKET_TOP_URL)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: ${COIN_GECKO_250_MARKET_TOP_URL}`);
      return marketTop250;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}, get250MarketTop`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      } else {
        this.logger.error(e.message, 'get250MarketTop');
        throw e;
      }
    }
  }

  async getCoinsList(): Promise<Coin[]> {
    try {
      this.logger.time(`request: ${COIN_GECKO_COINS_LIST_URL}`);
      const coinsList = await this.httpService
        .get(COIN_GECKO_COINS_LIST_URL)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: ${COIN_GECKO_COINS_LIST_URL}`);
      return coinsList;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}, getCoinsList`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      } else {
        this.logger.error(e.message, 'getCoinsList');
        throw e;
      }
    }
  }

  async getCoinsListFromCoinMarketCap(): Promise<CoinMarketCapResponse> {
    try {
      this.logger.time(
        `request: ${COIN_MARKET_CAP_LIST_URL}, X-CMC_PRO_API_KEY: ${COIN_MARKET_CAP_API_KEY}`,
      );
      const marketCapCoinsList = await this.httpService
        .get(COIN_MARKET_CAP_LIST_URL, {
          headers: { 'X-CMC_PRO_API_KEY': COIN_MARKET_CAP_API_KEY },
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: ${COIN_MARKET_CAP_LIST_URL}`);
      return marketCapCoinsList;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}, getCoinsListFromCoinMarketCap`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      } else {
        this.logger.error(e.message, 'getCoinsListFromCoinMarketCap');
        throw e;
      }
    }
  }

  async getCoinsPricesUsd(ids: string): Promise<CoinGeckoSimplePrice> {
    try {
      this.logger.time(
        `request: ${COIN_GECKO_COIN_PRICE_URL}, count of ids: ${ids.length}, currency: ${USD}`,
      );
      const coinsPrices = await this.httpService
        .get(`${COIN_GECKO_COIN_PRICE_URL}?ids=${ids}&vs_currencies=${USD}`)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.time(
        `request: ${COIN_GECKO_COIN_PRICE_URL}, count of ids: ${ids.length}, currency: ${USD}`,
      );
      return coinsPrices;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`URL ${e.code || ' '}${e.config.url}`), 'getCoinsPricesUsd');
        if (e.response) {
          this.logger.error(e.response.data);
        }
      } else {
        this.logger.error(e.message, 'getCoinsListFromCoinMarketCap');
        throw e;
      }
    }
  }
}
