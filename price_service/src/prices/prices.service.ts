import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import _ from 'lodash';
import { EntityManager, Repository } from 'typeorm';

import { ChainService } from '../lookup/services/chain.service';
import { CurrencyService } from '../lookup/services/currency.service';
import { SECONDS_IN_DAY, SECONDS_IN_HOUR, timestampNow } from '../utils/time';
import {
  CurrentPricesPayload,
  HistoricalPricesPayload,
  PriceResponseDto,
  TimestampKeyPrice,
} from './dto/price.response.dto';
import { CurrentPricesRequest, HistoricalPricesRequest } from './interfaces';
import { AssetPrice } from './models';

type TimestampPrice = {
  timestamp: number;
  price: number;
};

type AssetPrices = {
  address: string;
  prices: Array<TimestampPrice>;
};

type PriceRow = {
  address: string;
  timestamp: number;
  value: string;
};

const DEFAULT_ALLOWED_CURRENT_PRICE_THRESHOLD = 6 * SECONDS_IN_HOUR;
const DEFAULT_ALLOWED_HISTORICAL_PRICE_THRESHOLD = 2 * SECONDS_IN_DAY;

@Injectable()
export class PriceService {
  cacheTTLInSeconds: number;
  allowedCurrentPriceThresholdInSeconds: number;
  allowedHistoricalPriceThresholdInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(AssetPrice) private readonly priceRepository: Repository<AssetPrice>,
    @Inject(ChainService) private readonly chainService: ChainService,
    @Inject(CurrencyService) private readonly currencyService: CurrencyService,
  ) {
    this.cacheTTLInSeconds = config.get<number>('PRICE_CACHE_TTL_IN_SECONDS') || 15 * 60;
    this.allowedCurrentPriceThresholdInSeconds =
      config.get<number>('ALLOWED_CURRENT_PRICE_THRESHOLD') ||
      DEFAULT_ALLOWED_CURRENT_PRICE_THRESHOLD;
    this.allowedHistoricalPriceThresholdInSeconds =
      config.get<number>('ALLOWED_HISTORICAL_PRICE_THRESHOLD') ||
      DEFAULT_ALLOWED_HISTORICAL_PRICE_THRESHOLD;
  }

  async getCurrentPrices(
    query: CurrentPricesRequest,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { chain, currency, addresses } = query;

    const allPrices = await this.getAllAssetPrices(chain, currency, addresses);
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
    query: HistoricalPricesRequest,
  ): Promise<PriceResponseDto<HistoricalPricesPayload>> {
    const { chain, currency, addresses, timestamps } = query;

    const allPrices = await this.getAllAssetPrices(chain, currency, addresses);
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

  private async getAllAssetPrices(
    chain: number,
    currency: number,
    addresses: string[],
  ): Promise<AssetPrices[]> {
    const { cached, notCached } = await this.getCachedPrices(chain, currency, addresses);
    if (!notCached.length) {
      return cached;
    }

    const query = `
      (
        SELECT a.address, ap.timestamp, ap.value
        FROM prices.asset a
        JOIN prices.asset_price ap
          ON a.id = ap.asset_id
        WHERE
          a.address IN ('${notCached.join("','")}') AND
          a.chain_id = ${chain} AND
          ap.currency_id = ${currency}
        ORDER BY ap.asset_id, ap.timestamp
      )
      UNION ALL
      (
        SELECT w.address, ap.timestamp, ap.value
        FROM prices.wrapped_asset w
        JOIN prices.asset a
          ON w.asset_id = a.id
        JOIN prices.asset_price ap
          ON a.id = ap.asset_id
        WHERE
          w.address IN ('${notCached.join("','")}') AND
          w.chain_id = ${chain} AND
          ap.currency_id = ${currency}
        ORDER BY ap.asset_id, ap.timestamp
      )
    `;

    const rows: PriceRow[] = await this.entityManager.query(query);
    const prices = this.mapRowsToAssetPrices(rows);
    // NOTE: We not need to wait for cache update
    this.updateCachedPrices(chain, currency, addresses, prices);

    return cached.concat(prices);
  }

  private async getCachedPrices(
    chain: number,
    currency: number,
    addresses: string[],
  ): Promise<{
    cached: AssetPrices[];
    notCached: string[];
  }> {
    const notCached: string[] = [];
    const cached: AssetPrices[] = [];

    for (const address of addresses) {
      const cacheKey = this.getCacheKey(chain, currency, address);
      const cachedPrices = await this.cache.get<TimestampPrice[]>(cacheKey);
      if (cachedPrices) {
        cached.push({ address, prices: cachedPrices });
      } else {
        notCached.push(address);
      }
    }

    return { cached, notCached };
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
      prices: _.orderBy(pricesMap[address], 'timestamp'),
    }));
  }

  private async updateCachedPrices(
    chain: number,
    currency: number,
    addresses: string[],
    assetPrices: AssetPrices[],
  ): Promise<void> {
    await Promise.all(
      assetPrices.map(({ address, prices }) => {
        const cacheKey = this.getCacheKey(chain, currency, address);
        return this.cache.set(cacheKey, prices, { ttl: this.cacheTTLInSeconds });
      }),
    );

    // NOTE: We update cache with empty data for not found addresses to not query them again
    for (const address of addresses) {
      const cacheKey = this.getCacheKey(chain, currency, address);
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

    const { price } = _.minBy(candidates, (price) => Math.abs(price.timestamp - timestamp));
    return price;
  }

  private getCurrentPrice(prices: TimestampPrice[]): number {
    const lastPrice = _.last(prices);
    if (!lastPrice) {
      return null;
    }

    const { timestamp, price } = lastPrice;
    const isPriceOutdated = timestampNow() - timestamp > this.allowedCurrentPriceThresholdInSeconds;
    if (isPriceOutdated) {
      return null;
    }

    return price;
  }

  private getCacheKey(chain: number, currency: number, address: string): string {
    return `price_${chain}_${currency}_${address}`;
  }
}
