import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { map } from 'rxjs/operators';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainIdEnum,
  CurrencyIdEnum,
  CurrentPricesPayload,
  Logger,
  PriceResponseDto,
} from '@app/common';

import { SECONDS_IN_HOUR } from '../../common/utils/time';

import { PriceService } from '../prices/prices.service';
import { CurrencyResponseDto } from './currency.response.dto';
import { CurrencyEntity } from './entities/currency.entity';
import { CurrencyLayerResponse } from './interfaces/currency.layer.response';

export class CurrencyService {
  cacheTTLInSeconds: number;
  currencyLayerUrl: string;
  currencyLayerApiKey: string;

  constructor(
    @Inject(forwardRef(() => PriceService)) private readonly priceService: PriceService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(CurrencyEntity) private readonly repository: Repository<CurrencyEntity>,
  ) {
    this.cacheTTLInSeconds =
      config.get<number>('CURRENCY_CACHE_TTL_IN_SECONDS') || 24 * SECONDS_IN_HOUR;
    this.currencyLayerUrl = this.config.get<string>('CURRENCYLAYER_ENDPOINT');
    this.currencyLayerApiKey = this.config.get<string>('CURRENCYLAYER_API_KEY');
  }

  getAll(): Promise<CurrencyEntity[]> {
    return this.repository.find();
  }

  async getById(id: CurrencyIdEnum): Promise<CurrencyEntity> {
    return this.getOrSetCache(`currency_${id}`, () => {
      return this.repository.findOne({ where: { id } });
    });
  }

  async getAvailablePrices(): Promise<CurrencyResponseDto> {
    const errors = new Set<string>();
    let quotes: Map<string, number> = null;
    const requestedCurrencies = [
      'USD',
      'CAD',
      'EUR',
      'JPY',
      'GBP',
      'AUD',
      'CNY',

      // Crypto to be priced using price service
      // 'BTC',
      // 'ETH'
      // 'BNB',
      // 'AVAX',
      // 'Matic'
      // 'FTM'
    ].join();

    const currencies = await this.getOrSetCache<CurrencyLayerResponse>(
      `currencies-${requestedCurrencies}`,
      async () => {
        const response: CurrencyLayerResponse = await this.httpService
          .get(this.currencyLayerUrl, {
            params: {
              // eslint-disable-next-line camelcase
              access_key: this.currencyLayerApiKey,
              currencies: requestedCurrencies,
            },
          })
          .pipe(map((response) => response.data))
          .toPromise();

        if (response.success === true) {
          return response;
        }

        this.logger.error(response.error.info, null, 'CurrencyLayer API');
        errors.add('Failure with CurrencyLayer');
      },
    );

    // Set quotes map
    quotes = currencies.success
      ? new Map(Object.entries(currencies.quotes))
      : new Map([['USDUSD', 1]]);

    // Chain 1
    const BTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
    const ETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    // Chain 2
    const BNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
    // Chain 3
    const MATIC = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
    // Chain 4
    const FTM = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83';
    // Chain 6
    const AVAX = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';

    const [ethPrices, bscPrices, plgPrices, ftmPrices, avaxPrices] = await Promise.allSettled([
      this.fetchPrices(ChainIdEnum.eth, [BTC, ETH]),
      this.fetchPrices(ChainIdEnum.bnb, [BNB]),
      this.fetchPrices(ChainIdEnum.plg, [MATIC]),
      this.fetchPrices(ChainIdEnum.ftm, [FTM]),
      this.fetchPrices(ChainIdEnum.avax, [AVAX]),
    ]);

    this.addCryptoPriceToCurrencyLayerResponse(quotes, 'USDETH', ETH, ethPrices, errors);
    this.addCryptoPriceToCurrencyLayerResponse(quotes, 'USDBTC', BTC, ethPrices, errors);
    this.addCryptoPriceToCurrencyLayerResponse(quotes, 'USDBNB', BNB, bscPrices, errors);
    this.addCryptoPriceToCurrencyLayerResponse(quotes, 'USDMATIC', MATIC, plgPrices, errors);
    this.addCryptoPriceToCurrencyLayerResponse(quotes, 'USDFTM', FTM, ftmPrices, errors);
    this.addCryptoPriceToCurrencyLayerResponse(quotes, 'USDAVAX', AVAX, avaxPrices, errors);

    return plainToClass(CurrencyResponseDto, {
      // remap all keys to remove USD (USDEUR => EUR, USDBTC => BTC)
      quotes: Array.from(quotes.entries()).reduce((acc, [currency, price]) => {
        acc[currency.replace(/^USD/, '')] = price;
        return acc;
      }, {}),
      errors: Array.from(errors.values()),
    });
  }

  addCryptoPriceToCurrencyLayerResponse(
    quotes: Map<string, number>,
    key: string,
    address: Address,
    prices: PromiseSettledResult<PriceResponseDto<CurrentPricesPayload>>,
    errors: Set<string>,
  ) {
    if (prices.status === 'fulfilled' && prices.value.prices[address]) {
      quotes.set(key, 1 / prices.value.prices[address]);
    } else {
      errors.add(`Failed to get price for ${key}`);
    }
  }

  async fetchPrices(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chain: ChainIdEnum,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    assets: Address[],
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    // throw new Error('Could not import price Service');
    // TODO: import priceService
    return this.priceService.fetchPrices({
      chain,
      currency: CurrencyIdEnum.usd,
      addresses: assets,
    });
  }

  async getOrSetCache<T>(cacheKey: string, callback: () => Promise<T>): Promise<T> {
    const cacheValue = await this.cache.get<T>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const response = await callback();
    if (typeof response !== 'undefined') {
      await this.cache.set(cacheKey, response, { ttl: this.cacheTTLInSeconds });
    }

    return response;
  }
}
