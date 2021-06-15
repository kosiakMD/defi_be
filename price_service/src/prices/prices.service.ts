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
  PriceBatchRequestDto,
  CurrentPricesPayloadV2,
  HistoricalPricesPayloadV2,
  CurrentPricesPayload,
  HistoricalPricesPayload,
  PriceResponseDto,
  TimestampKeyPrice,
} from './dto';
import { CurrentPricesRequest, HistoricalPricesRequest } from './interfaces';
import { AssetPrice } from './models';

type TimestampPrice = {
  timestamp: number;
  price: number;
};

type TokenAddress = {
  address: string;
};

type TokenDetails = {
  isLp: boolean;
  platform: string;
};

type AssetPrices = {
  address: string;
  prices: Array<TimestampPrice>;
};

type AssetV2Additional = {
  platform: string;
  isLp: boolean;
};

type AssetPricesV2 = AssetPrices & AssetV2Additional;

type PriceRow = {
  address: string;
  timestamp: number;
  value: string;
};

type PriceRowV2 = PriceRow & AssetV2Additional;

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

  async getNonLpTokens(): Promise<string[]> {
    const list = await this.getNonLpTokenList();
    const addresses = list.map(({ address }) => address);
    return addresses;
  }

  async getCurrentPricesV2(
    query: CurrentPricesRequest,
  ): Promise<PriceResponseDto<CurrentPricesPayloadV2>> {
    const { chain, currency, addresses } = query;

    const allPrices = await this.getAllAssetPricesV2(chain, currency, addresses);
    const response = addresses.reduce<{
      [address: string]: { price: number; platform: string; isLp: boolean };
    }>((map, address) => {
      const assetPrices = allPrices.find((asset) => {
        return asset.address === address;
      });
      const prices = assetPrices?.prices || [];
      const price = this.getCurrentPrice(prices);
      return {
        ...map,
        [address]: {
          price,
          platform: allPrices[0].platform,
          isLp: allPrices[0].isLp,
        },
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

  public async getHistoricalPricesV2(
    query: HistoricalPricesRequest,
  ): Promise<PriceResponseDto<HistoricalPricesPayloadV2>> {
    const { chain, currency, addresses, timestamps } = query;

    const allPrices = await this.getAllAssetPricesV2(chain, currency, addresses);
    const response = addresses.reduce<{
      [address: string]: { prices: TimestampKeyPrice; platform: string; isLp: boolean };
    }>((map, address) => {
      const assetPrices = allPrices.find((asset) => asset.address === address);
      const prices = assetPrices?.prices || [];
      const { platform, isLp } = assetPrices || { platform: '', isLp: false };

      return {
        ...map,
        [address]: {
          prices: this.matchPrices(
            this.allowedHistoricalPriceThresholdInSeconds,
            timestamps,
            prices,
          ),
          platform: platform,
          isLp: isLp,
        },
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

    const allPrices = await this.getAllAssetPrices(chain, currency, addresses);
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

  private async getNonLpTokenList(): Promise<TokenAddress[]> {
    const query = `
      (
        SELECT address
        FROM prices.asset 
        WHERE "isLp" = false
      )
    `;
    const rows: TokenAddress[] = await this.entityManager.query(query);
    return rows;
  }

  private async getAllAssetPricesV2(
    chain: number,
    currency: number,
    addresses: string[],
  ): Promise<AssetPricesV2[]> {
    const { cached, notCached } = await this.getCachedPricesV2(chain, currency, addresses);

    // be sure that data is fresh and do not depends on service parameters
    cached.forEach((asset) => {
      const price = this.getCurrentPrice(asset?.prices || []);
      if (!price) {
        notCached.push(asset.address);
      }
    });

    if (!notCached.length) {
      return cached;
    }

    const query = `
      (
        SELECT a.address, a.platform, a."isLp", ap.timestamp, ap.value
        FROM prices.asset a
        JOIN prices.asset_price ap
          ON a.id = ap.asset_id
        WHERE
          a.address IN ('${addresses.join("','")}') AND
          a.chain_id = ${chain} AND
          ap.currency_id = ${currency}
        ORDER BY ap.asset_id, ap.timestamp
      )
    `;

    const rows: PriceRowV2[] = await this.entityManager.query(query);
    const prices = this.mapRowsToAssetPricesV2(rows);
    // NOTE: We not need to wait for cache update
    this.updateCachedPricesV2(chain, currency, addresses, prices);

    return prices;
    //return cached.concat(prices);
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
      if (cachedPrices?.length) {
        cached.push({ address, prices: cachedPrices });
      } else {
        notCached.push(address);
      }
    }

    return { cached, notCached };
  }

  private async getCachedPricesV2(
    chain: number,
    currency: number,
    addresses: string[],
  ): Promise<{
    cached: AssetPricesV2[];
    notCached: string[];
  }> {
    const notCached: string[] = [];
    const cached: AssetPricesV2[] = [];

    for (const address of addresses) {
      const cacheKey = this.getCacheKey(chain, currency, address);
      const cachedPrices = await this.cache.get<TimestampPrice[]>(cacheKey);
      const cacheDetailsKey = this.getDetailsCacheKey(chain, currency, address);
      const cachedDetailsPrices = await this.cache.get<TokenDetails>(cacheDetailsKey);
      if (!_.isEmpty(cachedPrices) && cachedDetailsPrices) {
        cached.push({
          address,
          prices: cachedPrices,
          isLp: cachedDetailsPrices['isLp'],
          platform: cachedDetailsPrices['platform'],
        });
      } else {
        notCached.push(address);
      }
    }

    return { cached, notCached };
  }

  private mapRowsToAssetPricesV2(rows: PriceRowV2[]): AssetPricesV2[] {
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

    return Object.keys(pricesMap).map<AssetPricesV2>((address) => ({
      address,
      platform: rows[0].platform,
      isLp: rows[0]['isLp'],
      prices: _.orderBy(pricesMap[address], 'timestamp'),
    }));
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

  private async updateCachedPricesV2(
    chain: number,
    currency: number,
    addresses: string[],
    assetPrices: AssetPricesV2[],
  ): Promise<void> {
    await Promise.all(
      assetPrices.map(({ address, prices, isLp, platform }) => {
        const cacheDetailsKey = this.getDetailsCacheKey(chain, currency, address);
        this.cache.set(cacheDetailsKey, { isLp, platform }, { ttl: this.cacheTTLInSeconds });
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
  private getDetailsCacheKey(chain: number, currency: number, address: string): string {
    return `asset_details_${chain}_${currency}_${address}`;
  }
}
