import { Queue } from 'bull';
import { plainToClass } from 'class-transformer';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CacheService } from '@app/common/services/cache.service';
import { CrudService } from '@app/common/services/crud.service';
import { isSomeAddress } from '@app/common/utils';

import { JobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { SearchResultType } from '../../../common/enum/search-result-type.enum';
import { SearchParams } from '../../../common/interfaces/search.interfaces';

import { PriceService } from '../../prices/price.service';
import { AssetsHistoricalPriceRepository } from '../../prices/repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from '../../prices/repositories/asset-price.repository';
import { AssetCandidateRequest } from '../dto/asset-candidate.request';
import { AssetDto } from '../dto/asset.dto';
import { GetAssetRequest } from '../dto/get-asset.request';
import { SearchResultsEntryDto } from '../dto/search-results-entry.dto';
import { AssetEntity } from '../entities/asset.entity';
import { AssetsCandidateRepository } from '../repositories/assets-candidate.repository';
import { AssetsRepository } from '../repositories/assets.repository';

@Injectable()
export class AssetsService extends CrudService<AssetsRepository> {
  private readonly cacheKeyPrefix: string;

  constructor(
    private configService: ConfigService,
    private readonly cache: CacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
    @InjectRepository(AssetsPriceRepository)
    private readonly assetsPriceRepository: AssetsPriceRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
    @InjectRepository(AssetsCandidateRepository)
    private readonly assetsCandidateRepository: AssetsCandidateRepository,
    private readonly priceService: PriceService,
  ) {
    super(AssetsRepository);
    this.cacheKeyPrefix = `${this.configService //
      .get('SERVICE_NAME')
      .replace(' ', '-')
      .toLowerCase()}`;
  }

  public async getAsset(request: GetAssetRequest): Promise<AssetDto> {
    const [response] = await this.getBulkAssets([request]);
    return response;
  }

  public async getBulkAssets(requests: GetAssetRequest[]): Promise<AssetDto[]> {
    const validRequests = requests.filter(({ address }) => isSomeAddress(address));
    const assets = await this.getAssets(validRequests);
    // TODO: Historical prices are not handled
    // TODO: Add mapping, not expose everything (e.g. created at)
    // TODO: This mapping code looks ugly, it should be extracted into mapper or use https://www.npmjs.com/package/@automapper/nestjs
    return assets;
  }

  private async addPrices(dtos: AssetDto[]): Promise<AssetDto[]> {
    const prices = await this.priceService.getPrices(dtos);
    // TODO: Not base on index
    return dtos.map((dto, index) => ({ ...dto, price: prices[index].price }));
  }

  private async getAssets(requests: GetAssetRequest[]): Promise<AssetDto[]> {
    const assets = [];

    if (this.configService.get('USE_REDIS_TO_GET_ASSETS')) {
      // TODO: Instead of doing this we should just add cached repository
      const cachedAssets = await this.getAssetsFromCache(
        // Asset requests with pricesAt have to be get from database
        requests, //.filter((request) => !!request.pricesAt),
      );
      assets.push(...cachedAssets);
    }

    const databaseAssetsRequests = this.excludeFoundAssets(requests, assets);

    if (!databaseAssetsRequests.length) {
      return assets;
    }

    const databaseAssets = await this.getAssetsFromDatabase(databaseAssetsRequests);
    const databaseAssetsToCache = {};

    databaseAssets.forEach((databaseAsset) => {
      databaseAssetsToCache[this.getAssetCacheKey(databaseAsset)] = this.findUnderlying(
        //
        databaseAsset,
        databaseAssetsToCache,
      );
    });
    assets.push(...Object.values(databaseAssetsToCache));

    // this.setAssetsToCache(databaseAssetsToCache);

    if (assets.length === requests.length) {
      return assets;
    }

    const unknownAssetsRequests = this.excludeFoundAssets(databaseAssetsRequests, databaseAssets);
    this.processAssets(unknownAssetsRequests);

    // TODO: Historical prices are not handled
    // TODO: Add mapping, not expose everything (e.g. created at)
    return assets;
  }

  private excludeFoundAssets(requests: GetAssetRequest[], assets: AssetDto[]) {
    return requests.filter(
      (request) => !assets.some((asset) => this.isRequestMatchingAsset(request, asset)),
    );
  }

  private isRequestMatchingAsset(request: GetAssetRequest, asset: AssetDto) {
    return (
      request.chainId === asset.chainId &&
      request.address?.toLowerCase() === asset.address?.toLowerCase()
    );
  }

  public async getAssetsFromCache(requests: GetAssetRequest[]): Promise<AssetDto[]> {
    const assetsFromCache = (
      await this.cache.mget(requests.map((request) => this.getAssetCacheKey(request)))
    ).filter(Boolean);
    const underlyingAssetsCacheKeys = [];
    for (const assetFromCache of assetsFromCache) {
      if (assetFromCache.underlying) {
        assetFromCache.underlying.forEach((underlying) => {
          const key = this.getAssetCacheKey(underlying.underlyingAssetRef);
          // Check if the key was found before
          if (!underlyingAssetsCacheKeys.find((k) => k === key)) {
            underlyingAssetsCacheKeys.push(key);
          }
        });
      }
    }
    if (underlyingAssetsCacheKeys.length) {
      assetsFromCache.push(...(await this.cache.mget(underlyingAssetsCacheKeys)).filter(Boolean));
    }
    return assetsFromCache;
  }

  public async setAssetsToCache(assets: AssetDto[]): Promise<void> {
    await this.cache.mset(
      assets.map((asset) => ({
        key: this.getAssetCacheKey(asset),
        value: plainToClass(AssetDto, asset),
      })),
    );
  }

  private findUnderlying(dbAsset, dbAsetsToCache) {
    const dbAssetToCache = { ...dbAsset };
    dbAssetToCache.underlying = [];
    dbAsset.underlying?.forEach(({ underlyingAsset, position }) => {
      if (underlyingAsset.underlying?.length) {
        underlyingAsset.underlying.forEach(({ underlyingAsset }) => {
          dbAsetsToCache[this.getAssetCacheKey(underlyingAsset)] = this.findUnderlying(
            underlyingAsset,
            dbAsetsToCache,
          );
        });
      }
      dbAssetToCache.underlying.push({
        underlyingAssetRef: {
          address: underlyingAsset.address,
          chainId: underlyingAsset.chainId,
        },
        position,
      });
      dbAsetsToCache[this.getAssetCacheKey(underlyingAsset)] = this.findUnderlying(
        underlyingAsset,
        dbAsetsToCache,
      );
    });
    return dbAssetToCache;
  }

  private getAssetCacheKey({ address, chainId }) {
    return `${this.cacheKeyPrefix}-${chainId}-${address}`;
  }

  private getAssetsFromDatabase(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    const underliyngRelationName = 'underlying';
    const underlyingAssetRelationName = 'underlyingAsset';
    let initialRelationName = 'underlying.underlyingAsset';
    const relations = ['underlying', initialRelationName];
    // It means 3 level tree including initial relations and last one
    while (relations.length < 3 * 2) {
      initialRelationName += '.' + underliyngRelationName;
      relations.push(initialRelationName);
      initialRelationName += '.' + underlyingAssetRelationName;
      relations.push(initialRelationName);
    }
    relations.push('historicalPrices');
    // TODO: Filter out outdated prices in repository
    return this.assetsRepository.findManyByAddressesAndChainIds(requests, relations);
  }

  private async processAssets(requests: GetAssetRequest[]): Promise<void> {
    requests.map((request) => {
      this.logger.log('Send asset for processing', request);
      return this.assetsQueue.add(JobName.ASSET_METADATA, {
        address: request.address,
        chainId: request.chainId,
      });
    });
  }

  public async search(searchParams: SearchParams): Promise<SearchResultsEntryDto[]> {
    const assets = await this.assetsRepository.findAssetsByParams(searchParams);
    return assets.map((asset) => ({
      type: SearchResultType.ASSET,
      icon: asset.icon,
      name: asset.name,
      metadata: {
        address: asset.address,
        chainId: asset.chainId,
        symbol: asset.symbol,
      },
    }));
  }

  public async saveAssetCandidate({ chainId, address }: AssetCandidateRequest) {
    this.logger.log('Saving assets candidate', { chainId, address });
    const existing = await this.assetsCandidateRepository.getBy(chainId, address);
    if (existing) {
      this.logger.log('Assets candidate already exists', { chainId, address });
      return;
    }

    const assetsCandidateEntity = this.assetsCandidateRepository.create({
      address,
      chainId,
    });
    await this.assetsCandidateRepository.save(assetsCandidateEntity);
    this.logger.log('Saved assets candidate', { chainId, address });
  }
}
