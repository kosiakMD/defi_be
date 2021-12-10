import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import _last from 'lodash/last';
import _minBy from 'lodash/minBy';
import _orderBy from 'lodash/orderBy';
import { EntityManager, Repository } from 'typeorm';

import { CACHE_MANAGER, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainIdEnum, CurrencyIdEnum } from '@app/common/enum';
import { PriceSourcePriority } from '@app/common/enum/price.enum';
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
import { GetCurrentPricesResponseDto } from './dto/get.current.prices.response.dto';
import { AssetEntity } from './entities/asset.entity';
import { AssetCurrentPriceEntity } from './entities/asset_current_price.entity';
import { AssetPriceEntity } from './entities/asset_price.entity';
import { getStepCount, interpolation } from './helpers';
import { PriceRangePeriod, TimeframeFrequentlyInMin, TimePeriodInDays } from './prices.enum';
import {
  AssetPrices,
  AssociatedAssetPrice,
  CurrentPrice,
  PriceRow,
  TimestampPrice,
} from './prices.types';

const DEFAULT_ALLOWED_CURRENT_PRICE_THRESHOLD = 6 * SECONDS_IN_HOUR;
const DEFAULT_ALLOWED_HISTORICAL_PRICE_THRESHOLD = 2 * SECONDS_IN_DAY;

export class PriceService {
  cacheTTLInSeconds: number;
  cacheHistoricalTTLInSeconds: number;
  allowedCurrentPriceThresholdInSeconds: number;
  allowedHistoricalPriceThresholdInSeconds: number;

  private static mapRowToAsset(row: any): AssetEntity {
    const asset: AssetEntity = plainToClass(AssetEntity, row);
    asset.chainId = row.chain_id;
    return asset;
  }

  private static mapRowToCurrentPrices(row: any): AssetCurrentPriceEntity {
    const assetPrice: AssetCurrentPriceEntity = plainToClass(AssetCurrentPriceEntity, {});

    assetPrice.id = row.id;
    assetPrice.value = row.value;
    assetPrice.assetId = Number.parseInt(row.asset_id);
    assetPrice.currencyId = row.currency_id;
    assetPrice.updatedAt = row.updated_at;
    assetPrice.sourceId = row.source_id;

    return assetPrice;
  }

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
    @Inject(forwardRef(() => CurrencyService)) private readonly currencyService: CurrencyService,
    private readonly config: ConfigService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(AssetPriceEntity)
    private readonly currentPriceRepository: Repository<AssetPriceEntity>,
    private priceRepository: PriceRepository,
    @Inject(ChainService) private readonly chainService: ChainService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
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

  public async updateCurrentPrice(priceRequests: PriceRequestCurrentDto[]): Promise<void> {
    priceRequests = priceRequests.filter((dto) => dto.price);
    // Cache prices for 24 hour return calculations
    this.cacheRawPriceRequest(priceRequests);

    // get a list of assets that exist in DB
    // TODO: We cannot use string concatination here!
    const sqlCondition: string = this.priceRepository.getFindAssetsSqlCondition(priceRequests);
    const foundAssets: AssetEntity[] = (
      await this.priceRepository.findAssetsByAddressesAndChains(sqlCondition)
    ).map((row) => PriceService.mapRowToAsset(row));

    // filter a list of DTOs for which no assets were found
    const dtoForMissingAssets: PriceRequestCurrentDto[] = priceRequests.filter(
      (dto) =>
        !foundAssets.some(
          (asset) => asset.address === dto.address && asset.chainId === dto.chainId,
        ),
    );

    // save new assets from dto to DB
    let addedAssets: AssetEntity[] = [];
    if (dtoForMissingAssets.length) {
      const sqlValues: string = this.priceRepository.getSqlValues(
        dtoForMissingAssets,
        (dto) => `('${dto.address}',${dto.chainId})`,
      );
      addedAssets = (await this.priceRepository.savePriceAssets(sqlValues)).map((row) =>
        PriceService.mapRowToAsset(row),
      );
    }

    // create a new list linking all assets (old and new) with DTOs
    const associatedAssetsPrices = this.getAssociatedAssetsPrices(
      foundAssets.concat(addedAssets),
      priceRequests,
    );

    // save prices associated with asset ids
    const pricesSqlValues: string = this.priceRepository.getSqlValues(
      associatedAssetsPrices,
      (price) => `(${price.assetId},${price.currencyId},${price.value},${price.sourceId},NOW())`,
    );
    const assetCurrentPrices: AssetCurrentPriceEntity[] = (
      await this.priceRepository.saveCurrentPrices(pricesSqlValues)
    ).map((row) => PriceService.mapRowToCurrentPrices(row));

    // store current price to cache using associated list
    assetCurrentPrices.forEach((assetPrice) => {
      const associatedAsset: AssociatedAssetPrice = associatedAssetsPrices.find(
        (value) => value.assetId === assetPrice.assetId,
      );
      const { chainId, address } = associatedAsset;
      this.cache.set<CurrentPrice>(
        PriceService.getCurrentPriceKey(chainId, assetPrice.currencyId, address),
        { address, value: assetPrice.value },
        { ttl: this.cacheTTLInSeconds },
      );
    });
  }

  async getAllAssetsCurrentPrices() {
    return (await this.priceRepository.getAllCurrentPrices()).map((row) => {
      return plainToClass(GetCurrentPricesResponseDto, {
        address: row.address,
        value: row.value,
        chainId: row.chain_id,
        updatedAt: row.updated_at,
        sourceId: row.source_id || PriceSourcePriority.chain,
      });
    });
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

  cacheRawPriceRequest(requestBody: PriceRequestCurrentDto[]): void {
    const nearestTimeStamp = dateToTimestamp(roundToNearestHour(new Date()));
    requestBody.forEach((price) => {
      this.cache.set<PriceRequestCurrentDto>(
        PriceService.getHistoricCacheKey(
          price.chainId,
          price.currencyId,
          nearestTimeStamp,
          price.address,
        ),
        price,
        { ttl: this.cacheHistoricalTTLInSeconds }, // 48 hours
      );
    });
  }

  async fetchPrices(requestBody: PriceQueryDto): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { chain, currency, addresses } = requestBody;
    const { cached, notCached } = await this.getCachedCurrentPrices(chain, currency, addresses);
    if (!notCached.length) {
      return this.buildPricesResponse(chain, currency, cached);
    }

    this.logger.warn(
      `No prices were found in cache for ${notCached.length} address(es)\n${notCached}`,
    );

    const rows: CurrentPrice[] = await this.priceRepository.getCurrentPricesByAddressesAndChain(
      notCached,
      chain,
    );

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
    assets: AssetEntity[],
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
        sourceId: associatedDto.sourceId || PriceSourcePriority.chain,
      };
    });
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
    const notCached: string[] = [];
    const cached: CurrentPrice[] = [];

    for (const address of addresses) {
      const cacheKey = PriceService.getCurrentPriceKey(chain, currency, address);
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
      prices: _orderBy(pricesMap[address], 'timestamp'),
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
      this.cache.set<CurrentPrice>(
        PriceService.getCurrentPriceKey(chain, currency, price.address),
        price,
      );
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
        const key = PriceService.getCurrentPriceKey(chain, currency, address);
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
    const isPriceOutdated = timestampNow() - timestamp > this.allowedCurrentPriceThresholdInSeconds;
    if (isPriceOutdated) {
      return null;
    }

    return price;
  }
}
