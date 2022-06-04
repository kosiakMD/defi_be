import { plainToClass } from 'class-transformer';
import isNil from 'lodash/isNil';
import _last from 'lodash/last';
import _minBy from 'lodash/minBy';
import _orderBy from 'lodash/orderBy';

import { CACHE_MANAGER, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainIdEnum, CurrencyIdEnum } from '@app/common/enum';
import { CacheService } from '@app/common/services/cache.service';
import { dateToTimestamp, roundToNearestHour } from '@app/common/utils/dates';

import { SECONDS_IN_DAY, SECONDS_IN_HOUR, timestampNow } from '../../common/utils/time';

import { ChainService } from '../lookup/chain.service';
import { CurrencyService } from '../lookup/currency.service';
import { PriceRepository } from '../repositories/price.repository';
import {
  CurrentPricesPayload,
  HistoricalPriceQueryDto,
  HistoricalPricesPayload,
  PriceBatchRequestDto,
  PriceQueryDto,
  PriceRangeRequestDto,
  PriceRequestCurrentDto,
  PriceResponseDto,
  TimestampKeyPrice,
} from './dto';
import { getStepCount, interpolation } from './helpers';
import { PriceRangePeriod, TimeframeFrequentlyInMin, TimePeriodInDays } from './prices.enum';
import { AssetPrices, CurrentPrice, PriceRow, TimestampPrice } from './prices.types';

const DEFAULT_ALLOWED_CURRENT_PRICE_THRESHOLD = 6 * SECONDS_IN_HOUR;
const DEFAULT_ALLOWED_HISTORICAL_PRICE_THRESHOLD = 2 * SECONDS_IN_DAY;

export class PriceService {
  cacheTTLInSeconds: number;
  cacheHistoricalTTLInSeconds: number;
  allowedCurrentPriceThresholdInSeconds: number;
  allowedHistoricalPriceThresholdInSeconds: number;

  private static getRangeTimestamps(range: PriceRangePeriod, minFoundTimestamp?: number): number[] {
    let timestamp: number = Math.floor(Date.now() / 1000);
    if (range === PriceRangePeriod.all && !minFoundTimestamp) {
      // TODO: need to check
      timestamp = timestamp - minFoundTimestamp;
    }
    const freqInMin = Number(TimeframeFrequentlyInMin[range]);
    const dayCount = Number(TimePeriodInDays[range]);

    const stepsCount = getStepCount(freqInMin, dayCount);
    return interpolation(timestamp, TimeframeFrequentlyInMin[range], stepsCount);
  }

  private static getHistoricCacheKey(
    chain: ChainIdEnum,
    currency: number,
    timestamp: number,
    address: string,
  ) {
    return `historic_price_${chain}_${currency}_${timestamp}_${address}`;
  }

  private static getCacheKey(chain: ChainIdEnum, currency: number, address: string): string {
    return `price_${chain}_${currency}_${address}`;
  }

  private static getCurrentPriceKey(chain: ChainIdEnum, currency: number, address: string): string {
    return `current_price_${chain}_${currency}_${address}`;
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: CacheService,
    private readonly priceRepository: PriceRepository,
    @Inject(ChainService) private readonly chainService: ChainService,
    @Inject(forwardRef(() => CurrencyService)) private readonly currencyService: CurrencyService,
  ) {
    this.cacheTTLInSeconds = config.get<number>('PRICE_CACHE_TTL_IN_SECONDS') || 15 * 60;
    this.cacheHistoricalTTLInSeconds = config.get<number>('CACHE_HISTORIC_PRICES_TTL_IN_SECONDS');
    this.allowedCurrentPriceThresholdInSeconds =
      config.get<number>('ALLOWED_CURRENT_PRICE_THRESHOLD') ||
      DEFAULT_ALLOWED_CURRENT_PRICE_THRESHOLD;
    this.allowedHistoricalPriceThresholdInSeconds =
      config.get<number>('ALLOWED_HISTORICAL_PRICE_THRESHOLD') ||
      DEFAULT_ALLOWED_HISTORICAL_PRICE_THRESHOLD;
  }

  async getCurrentPrices(query: PriceQueryDto): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { chain, currency, addresses } = query;

    const allPrices = await this.getAssetPricesByAddressesChainAndCurrency(
      chain,
      currency,
      addresses,
    );
    const response = addresses.reduce<{ [address: string]: number }>((map, address) => {
      const assetPrices = allPrices.find((asset) => asset.address === address);
      const prices = assetPrices?.prices || [];
      const price = this.getCurrentPrice(prices);
      return {
        ...map,
        [address]: price,
      };
    }, {});

    return {
      prices: response,
      chain: await this.chainService.getById(chain),
      currency: await this.currencyService.getById(currency),
    };
  }

  public async getHistoricalPrices(
    query: HistoricalPriceQueryDto,
  ): Promise<PriceResponseDto<HistoricalPricesPayload>> {
    const { chain, currency, addresses, timestamps } = query;

    const allPrices = await this.getAssetPricesByAddressesChainAndCurrency(
      chain,
      currency,
      addresses,
    );
    const response = addresses.reduce<{ [address: string]: TimestampKeyPrice }>((map, address) => {
      const assetPrices = allPrices.find((asset) => asset.address === address);
      const prices = assetPrices?.prices || [];
      return {
        ...map,
        [address]: this.matchPrices(
          this.allowedHistoricalPriceThresholdInSeconds,
          timestamps,
          prices,
        ),
      };
    }, {});

    return {
      prices: response,
      chain: await this.chainService.getById(chain),
      currency: await this.currencyService.getById(currency),
    };
  }

  public async getPricesInBatches(
    query: PriceBatchRequestDto,
  ): Promise<PriceResponseDto<HistoricalPricesPayload>> {
    const { chain, currency, assets } = query;
    const addresses = assets.map(({ address }) => address);

    const allPrices = await this.getAssetPricesByAddressesChainAndCurrency(
      chain,
      currency,
      addresses,
    );
    const response = addresses.reduce<{ [address: string]: TimestampKeyPrice }>((map, address) => {
      const assetPrices = allPrices.find((asset) => asset.address === address);
      const timestamps = assets.find((asset) => asset.address === address)?.timestamps || [];
      const prices = assetPrices?.prices || [];
      return {
        ...map,
        [address]: this.matchPrices(
          this.allowedHistoricalPriceThresholdInSeconds,
          timestamps,
          prices,
        ),
      };
    }, {});

    return {
      prices: response,
      chain: await this.chainService.getById(chain),
      currency: await this.currencyService.getById(currency),
    };
  }

  async getPricesAtTimestamp(
    assets: string[],
    timestamp: number,
    chain: ChainIdEnum,
    currency: CurrencyIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const time = dateToTimestamp(roundToNearestHour(new Date(timestamp * 1000)));

    const data = await this.getRawPriceRequests(chain, currency, time, assets);

    const prices: CurrentPricesPayload = data.reduce((tokens, token) => {
      if (!assets.includes(token.address.toLowerCase())) {
        return tokens;
      }

      tokens[token.address] = token.price;
      return tokens;
    }, {});

    return {
      prices: prices,
      chain: await this.chainService.getById(chain),
      currency: await this.currencyService.getById(currency),
    };
  }

  public async updateCurrentPrice(requests: PriceRequestCurrentDto[]): Promise<void> {
    const notEmptyRequests = requests.filter((dto) => dto.price);
    await this.updatePricesInCache(notEmptyRequests);
    await this.cachePricesFor24HourReturns(notEmptyRequests);
  }

  async getRawPriceRequests(
    chain: ChainIdEnum,
    currency: CurrencyIdEnum,
    timestamp: number,
    assets: string[],
  ) {
    const promises = assets.map((asset) => {
      return this.cache.get<PriceRequestCurrentDto>(
        PriceService.getHistoricCacheKey(chain, currency, timestamp, asset),
      );
    });

    return (await Promise.all(promises)).filter(Boolean);
  }

  async cachePricesFor24HourReturns(prices: PriceRequestCurrentDto[]) {
    const nearestTimeStamp = dateToTimestamp(roundToNearestHour(new Date()));
    const cacheItems = prices.map((price) => ({
      key: PriceService.getHistoricCacheKey(
        price.chainId,
        price.currencyId,
        nearestTimeStamp,
        price.address,
      ),
      value: price,
    }));

    await this.cache.mset(cacheItems, { ttl: this.cacheHistoricalTTLInSeconds });
  }

  async fetchPrices(requestBody: PriceQueryDto): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { chain, currency, addresses } = requestBody;
    const { cached, notCached } = await this.getCachedCurrentPrices(chain, currency, addresses);

    if (!notCached.length) {
      this.logger.debug(
        `No prices were found in cache for ${notCached.length} address(es)\n${notCached}`,
      );
    }

    return this.buildPricesResponse(chain, currency, cached);
  }

  private async buildPricesResponse(
    chain: number,
    currency: number,
    rows,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    return {
      prices: this.mapRowsToCurrentPrices(rows),
      chain: await this.chainService.getById(chain),
      currency: await this.currencyService.getById(currency),
    };
  }

  private mapRowsToCurrentPrices(rows: CurrentPrice[]): CurrentPricesPayload {
    const result: CurrentPricesPayload = {};
    rows.forEach((row) => (result[row.address] = row.value));
    return result;
  }

  public async getRangePrices(
    query: PriceRangeRequestDto,
  ): Promise<PriceResponseDto<HistoricalPricesPayload>> {
    const { chain, currency, addresses, range } = query;

    /**
     * in case range = all we should find minimal timestamp
     * we need to find minimal timestamp for each address, so skipping for now
     */
    const timestamps =
      range === PriceRangePeriod.all ? [0] : PriceService.getRangeTimestamps(range);

    const allPrices = await this.getAssetPricesByAddressesChainAndCurrency(
      chain,
      currency,
      addresses,
    );
    const response = addresses.reduce<{ [address: string]: TimestampKeyPrice }>((map, address) => {
      const assetPrices = allPrices.find((asset) => asset.address === address);
      const prices = assetPrices?.prices || [];
      return {
        ...map,
        [address]: this.matchPrices(
          this.allowedHistoricalPriceThresholdInSeconds,
          range === PriceRangePeriod.all
            ? PriceService.getRangeTimestamps(range, assetPrices?.prices?.[0].timestamp)
            : timestamps,
          prices,
        ),
      };
    }, {});

    const result: PriceResponseDto<HistoricalPricesPayload> = plainToClass(PriceResponseDto, {});

    result.prices = response;
    result.chain = await this.chainService.getById(chain);
    result.currency = await this.currencyService.getById(currency);

    return result;
  }

  private async getAssetPricesByAddressesChainAndCurrency(
    chain: ChainIdEnum,
    currency: number,
    addresses: string[],
  ): Promise<AssetPrices[]> {
    const { cached, notCached } = await this.getCachedPrices(chain, currency, addresses);
    if (!notCached.length) {
      return cached;
    }

    const rows: PriceRow[] = await this.priceRepository.getCurrentPricesByAddressesChainAndCurrency(
      notCached,
      chain,
      currency,
    );
    const prices = this.mapRowsToAssetPrices(rows);
    // NOTE: We not need to wait for cache update
    this.updateCachedPrices(chain, currency, addresses, prices);

    return cached.concat(prices);
  }

  private async getCachedPrices(
    chain: ChainIdEnum,
    currency: number,
    addresses: string[],
  ): Promise<{
    cached: AssetPrices[];
    notCached: string[];
  }> {
    const notCached: string[] = [];
    const cached: AssetPrices[] = [];

    for (const address of addresses) {
      const cacheKey = PriceService.getCacheKey(chain, currency, address);
      const cachedPrices = await this.cache.get<TimestampPrice[]>(cacheKey);
      if (cachedPrices?.length) {
        cached.push({ address, prices: cachedPrices });
      } else {
        notCached.push(address);
      }
    }

    return { cached, notCached };
  }

  private async getCachedCurrentPrices(
    chain: ChainIdEnum,
    currency: number,
    addresses: string[],
  ): Promise<{
    cached: CurrentPrice[];
    notCached: string[];
  }> {
    const keys = addresses.map((address) =>
      PriceService.getCurrentPriceKey(chain, currency, address),
    );
    let cached = await this.cache.mget<CurrentPrice>(keys);
    cached = cached.filter((price) => !!price);

    const notCached = addresses.filter((address) =>
      cached.every((price) => price?.address !== address),
    );

    return { cached, notCached };
  }

  private async updatePricesInCache(prices: PriceRequestCurrentDto[]) {
    const cacheItems = prices.map((price) => ({
      key: PriceService.getCurrentPriceKey(price.chainId, price.currencyId, price.address),
      value: price,
    }));

    await this.cache.mset(cacheItems, { ttl: this.cacheTTLInSeconds });
  }

  private mapRowsToAssetPrices(rows: PriceRow[]): AssetPrices[] {
    const pricesMap = rows.reduce<{ [address: string]: TimestampPrice[] }>(
      (map, { address, timestamp, value }) => ({
        ...map,
        [address]: [
          ...(map[address] || []),
          { timestamp: Number(timestamp), price: Number(value) },
        ],
      }),
      {},
    );

    return Object.keys(pricesMap).map<AssetPrices>((address) => ({
      address,
      prices: _orderBy(pricesMap[address], 'timestamp'),
    }));
  }

  private async updateCachedPrices(
    chain: ChainIdEnum,
    currency: number,
    addresses: string[],
    assetPrices: AssetPrices[],
  ): Promise<void> {
    await Promise.all(
      assetPrices.map(({ address, prices }) => {
        const cacheKey = PriceService.getCacheKey(chain, currency, address);
        return this.cache.set(cacheKey, prices, { ttl: this.cacheTTLInSeconds });
      }),
    );

    // NOTE: We update cache with empty data for not found addresses to not query them again
    for (const address of addresses) {
      const cacheKey = PriceService.getCacheKey(chain, currency, address);
      const cached = await this.cache.get(cacheKey);
      if (!cached) {
        await this.cache.set(cacheKey, [], { ttl: this.cacheTTLInSeconds });
      }
    }
  }

  private matchPrices(
    maxTimeDifference: number,
    timestamps: number[],
    prices: TimestampPrice[],
  ): { [timestamp: string]: number } {
    return timestamps.reduce<{ [timestamp: string]: number }>(
      (map, timestamp) => ({
        ...map,
        [timestamp.toString()]: this.matchPrice(maxTimeDifference, timestamp, prices),
      }),
      {},
    );
  }

  private matchPrice(
    maxTimeDifference: number,
    timestamp: number,
    prices: TimestampPrice[],
  ): number {
    const candidates = prices.filter(
      (price) => Math.abs(price.timestamp - timestamp) <= maxTimeDifference,
    );
    if (!candidates || !candidates.length) {
      // NOTE: We need return null to cache not found tokens.
      return null;
    }

    const { price } = _minBy(candidates, (price) => Math.abs(price.timestamp - timestamp));
    return price;
  }

  private getCurrentPrice(prices: TimestampPrice[]): number {
    const lastPrice = _last(prices);
    if (!lastPrice) {
      return null;
    }

    const { timestamp, price } = lastPrice;
    const isPriceOutdated =
      timestampNow() - timestamp > this.allowedCurrentPriceThresholdInSeconds && !isNil(timestamp);
    if (isPriceOutdated) {
      return null;
    }

    return price;
  }
}
