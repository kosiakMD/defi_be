import { Cache } from 'cache-manager';
import _ from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, Repository } from 'typeorm';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';

import { Logger } from '../common/Logger/Logger.service';
import { ChainIdEnum, CurrencyIdEnum } from '../common/enum';

import { ChainService } from '../lookup/services/chain.service';
import { CurrencyService } from '../lookup/services/currency.service';
import { SECONDS_IN_DAY, SECONDS_IN_HOUR, timestampNow } from '../utils/time';
import {
  CurrentPricesPayload,
  HistoricalPriceQueryDto,
  HistoricalPricesPayload,
  PriceBatchRequestDto,
  PriceResponseDto,
  TimestampKeyPrice,
} from './dto';
import { PriceQueryDto } from './dto/price.query.dto';
import { PriceRequestCurrentDto } from './dto/price.request.current.dto';
import { Asset, AssetCurrentPrice, AssetPrice } from './models';

type TimestampPrice = {
  timestamp: number;
  price: number;
};

type AssetPrices = {
  address: string;
  prices: Array<TimestampPrice>;
};

type CurrentPrice = {
  address: string;
  value: number;
};

type PriceRow = {
  address: string;
  timestamp: number;
  value: string;
};

type AssociatedAssetPrice = {
  assetId: number;
  address: string;
  chainId: ChainIdEnum;
  currencyId: CurrencyIdEnum;
  value: number;
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.cacheTTLInSeconds = config.get<number>('PRICE_CACHE_TTL_IN_SECONDS') || 15 * 60;
    this.allowedCurrentPriceThresholdInSeconds =
      config.get<number>('ALLOWED_CURRENT_PRICE_THRESHOLD') ||
      DEFAULT_ALLOWED_CURRENT_PRICE_THRESHOLD;
    this.allowedHistoricalPriceThresholdInSeconds =
      config.get<number>('ALLOWED_HISTORICAL_PRICE_THRESHOLD') ||
      DEFAULT_ALLOWED_HISTORICAL_PRICE_THRESHOLD;
  }

  async getCurrentPrices(query: PriceQueryDto): Promise<PriceResponseDto<CurrentPricesPayload>> {
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
    query: HistoricalPriceQueryDto,
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

  public async updateCurrentPrice(requestBody: PriceRequestCurrentDto[]): Promise<void> {
    requestBody.forEach((dto) => (dto.address = dto.address.toLowerCase()));
    // get a list of assets that exist in DB
    const sqlCondition: string = this.getFindAssetsSqlCondition(requestBody);
    const foundAssets: Asset[] = (
      await this.entityManager.query(`SELECT * FROM prices.asset WHERE ${sqlCondition}`)
    ).map((row) => this.mapRowToAsset(row));

    // filter a list of DTOs for which no assets were found
    const dtoForMissingAssets: PriceRequestCurrentDto[] = requestBody.filter(
      (dto) =>
        !foundAssets.some(
          (asset) => asset.address === dto.address && asset.chainId === dto.chainId,
        ),
    );

    await this.entityManager.transaction(async (transactionalEntityManager: EntityManager) => {
      // save new assets from DTO to DB
      let addedAssets: Asset[] = [];
      if (dtoForMissingAssets.length) {
        const sqlValues: string = this.getSqlValues(
          dtoForMissingAssets,
          (dto) => `('${dto.address}',${dto.chainId})`,
        );
        addedAssets = (
          await transactionalEntityManager.query(
            `INSERT INTO prices.asset(address, chain_id) VALUES ${sqlValues} RETURNING *`,
          )
        ).map((row) => this.mapRowToAsset(row));
      }

      // create a new list linking all assets (old and new) with DTOs
      const associatedAssetsPrices: AssociatedAssetPrice[] = this.getAssociatedAssetsPrices(
        foundAssets.concat(addedAssets),
        requestBody,
      );

      // save prices associated with asset ids
      const pricesSqlValues: string = this.getSqlValues(
        associatedAssetsPrices,
        (price) => `('${price.assetId}',${price.currencyId},${price.value},NOW())`,
      );
      const assetCurrentPrices: AssetCurrentPrice[] = (
        await transactionalEntityManager.query(
          `INSERT INTO prices.asset_current_price(asset_id, currency_id, value, updated_at)
                VALUES ${pricesSqlValues}
                ON CONFLICT (asset_id) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
                RETURNING *;`,
        )
      ).map((row) => this.mapRowToCurrentPrices(row));

      // store current price to cache using associated list
      assetCurrentPrices.forEach((assetPrice) => {
        const associatedAsset: AssociatedAssetPrice = associatedAssetsPrices.find(
          (value) => value.assetId === assetPrice.assetId,
        );
        const { chainId, address } = associatedAsset;
        this.cache.set<CurrentPrice>(
          this.getCurrentPriceKey(chainId, assetPrice.currencyId, address),
          { address, value: assetPrice.value },
        );
      });
    });
  }

  async fetchPrices(requestBody: PriceQueryDto): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { chain, currency } = requestBody;
    const addresses = requestBody.addresses.map((address) => address.toLowerCase());
    const { cached, notCached } = await this.getCachedCurrentPrices(chain, currency, addresses);
    if (!notCached.length) {
      return this.buildPricesResponse(chain, currency, cached);
    }

    this.logger.warn(
      `No prices were found in cache for ${notCached.length} address(es)\n${notCached}`,
    );

    const query = `(
        SELECT a.address, ap.value
        FROM prices.asset a
        LEFT JOIN prices.asset_current_price ap
          ON a.id = ap.asset_id
        WHERE
          a.address IN ('${notCached.join("','")}') AND
          a.chain_id = ${chain}
        ORDER BY ap.asset_id
      )`;

    const rows: CurrentPrice[] = await this.entityManager.query(query);

    await this.updateCachedCurrentPrices(chain, currency, rows, notCached);

    return this.buildPricesResponse(chain, currency, rows.concat(cached));
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

  private getAssociatedAssetsPrices(
    assets: Asset[],
    listOfDTO: PriceRequestCurrentDto[],
  ): AssociatedAssetPrice[] {
    return assets.map((asset) => {
      const associatedDto: PriceRequestCurrentDto = listOfDTO.find(
        (dto) => dto.address === asset.address && dto.chainId === asset.chainId,
      );
      return {
        assetId: asset.id,
        address: asset.address,
        currencyId: associatedDto.currencyId,
        value: associatedDto.price,
        chainId: asset.chainId,
      };
    });
  }

  private getSqlValues(listOfObjects: any[], getValues): string {
    return listOfObjects.reduce<string>(
      (result: string, sourceObject: any, i: number) =>
        result + getValues(sourceObject) + (i !== listOfObjects.length - 1 ? ',' : ''),
      '',
    );
  }

  private getFindAssetsSqlCondition(requestBody: PriceRequestCurrentDto[]): string {
    return requestBody.reduce<string>(
      (result: string, dto: PriceRequestCurrentDto, i: number) =>
        result +
        `(address='${dto.address}' AND chain_id=${dto.chainId})` +
        (i !== requestBody.length - 1 ? ' OR ' : ''),
      '',
    );
  }

  private mapRowToAsset(row: any): Asset {
    return { ...row, chainId: row.chain_id } as Asset;
  }

  private mapRowToCurrentPrices(row: any): AssetCurrentPrice {
    return {
      id: row.id,
      value: row.value,
      assetId: Number.parseInt(row.asset_id),
      currencyId: row.currency_id,
      updatedAt: row.updated_at,
    };
  }

  private async getAllAssetPrices(
    chain: ChainIdEnum,
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
    `;

    const rows: PriceRow[] = await this.entityManager.query(query);
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

  private async getCachedCurrentPrices(
    chain: ChainIdEnum,
    currency: number,
    addresses: string[],
  ): Promise<{
    cached: CurrentPrice[];
    notCached: string[];
  }> {
    const notCached: string[] = [];
    const cached: CurrentPrice[] = [];

    for (const address of addresses) {
      const cacheKey = this.getCurrentPriceKey(chain, currency, address);
      const currentPrice = await this.cache.get<CurrentPrice>(cacheKey);
      if (currentPrice) {
        cached.push({ address, value: currentPrice.value });
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

  private async updateCachedCurrentPrices(
    chain: ChainIdEnum,
    currency: number,
    foundPrices: CurrentPrice[],
    allAddresses: string[],
  ): Promise<void> {
    // store to cache all prices found in DB
    foundPrices.forEach((price) => {
      this.cache.set<CurrentPrice>(this.getCurrentPriceKey(chain, currency, price.address), price);
    });

    if (foundPrices.length !== allAddresses.length) {
      // get all addresses not found in DB
      const foundAddresses = foundPrices.map((price) => price.address);
      const unknownAddresses = allAddresses.filter((address) => !foundAddresses.includes(address));
      this.logger.warn(
        `There is ${unknownAddresses.length} unknown address(es) stored in cache\n${unknownAddresses}`,
      );
      // store to cache all prices not found in DB with value=null
      unknownAddresses.forEach((address) => {
        const key = this.getCurrentPriceKey(chain, currency, address);
        this.cache.set(key, { value: null });
        foundPrices.push({ address, value: null });
      });
    }
  }

  private async updateCachedPrices(
    chain: ChainIdEnum,
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

  private getCurrentPriceKey(chain: ChainIdEnum, currency: number, address: string): string {
    return `current_price_${chain}_${currency}_${address}`;
  }

  private getCacheKey(chain: ChainIdEnum, currency: number, address: string): string {
    return `price_${chain}_${currency}_${address}`;
  }
}
