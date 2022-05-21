import { Queue } from 'bull';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CrudService } from '@app/common/services/crud.service';

import { SearchResultType } from '../../../common/enum/search-result-type.enum';
import { SearchParams } from '../../../common/interfaces/search.interfaces';

import { AssetsHistoricalPriceRepository } from '../../prices/repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from '../../prices/repositories/asset-price.repository';
import { AssetCandidateRequest } from '../dto/asset-candidate.request';
import { AssetCategoryDto } from '../dto/asset-category.dto';
import { AssetHistoricalPriceDto } from '../dto/asset-historical-price.dto';
import { AssetUnderlyingDto } from '../dto/asset-underlying.dto';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectQueue('assets') private readonly assetsQueue: Queue,
    @InjectRepository(AssetsRepository) private assetsRepository: AssetsRepository,
    @InjectRepository(AssetsPriceRepository) private assetsPriceRepository: AssetsPriceRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
    @InjectRepository(AssetsCandidateRepository)
    private assetsCandidateRepository: AssetsCandidateRepository,
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
    // const validRequests = requests.filter(({ address }) => isSomeAddress(address));
    const assets = await this.getAssets(requests);
    // TODO: Historical prices are not handled
    // TODO: Add mapping, not expose everything (e.g. created at)
    return assets.map((asset) =>
      plainToClass(AssetDto, {
        ...asset,
        categories: asset.categories.map((assetCategory) =>
          plainToClass(AssetCategoryDto, assetCategory),
        ),
        ...(asset.historicalPrices
          ? {
              historicalPrices: asset.historicalPrices.map((historicalPrice) =>
                plainToClass(AssetHistoricalPriceDto, historicalPrice),
              ),
            }
          : {}),
        ...(asset.underlying
          ? {
              underlying: asset.underlying.map((underlyingAsset) =>
                plainToClass(AssetUnderlyingDto, underlyingAsset),
              ),
            }
          : {}),
      }),
    );
  }

  private async getAssets(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    const assets = [];

    if (this.configService.get('USE_REDIS_TO_GET_ASSETS')) {
      const cachedAssets = await this.getAssetsFromCache(requests);
      assets.push(...cachedAssets);
    }

    if (assets.length === requests.length) {
      return assets;
    }

    const databaseAssetsRequests = this.excludeFoundAssets(requests, assets);
    const databaseAssets = await this.getAssetsFromDatabase(databaseAssetsRequests);
    assets.push(...databaseAssets);

    // this.setAssetsToCache(databaseAssets);

    if (assets.length === requests.length) {
      return assets;
    }

    const unknownAssetsRequests = this.excludeFoundAssets(databaseAssetsRequests, databaseAssets);
    this.processAssets(unknownAssetsRequests);

    // TODO: Historical prices are not handled
    // TODO: Add mapping, not expose everything (e.g. created at)
    return assets;
  }

  private excludeFoundAssets(requests: GetAssetRequest[], assets: AssetEntity[]) {
    return requests.filter(
      (request) => !assets.some((asset) => this.isRequestMatchingAsset(request, asset)),
    );
  }

  private isRequestMatchingAsset(request: GetAssetRequest, asset: AssetEntity) {
    return (
      request.chainId === asset.chainId &&
      request.address?.toLowerCase() === asset.address?.toLowerCase()
    );
  }

  public async getAssetsFromCache(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    const promises = requests.map((request) =>
      this.cacheManager.get<AssetEntity>(this.getAssetCacheKey(request)),
    );
    // TODO: Use Redis m_get instead of multiple requests
    const assets = await Promise.all(promises);
    return assets.filter((asset) => !!asset);
  }

  public async setAssetsToCache(assets: AssetEntity[] | AssetDto[]): Promise<void> {
    const promises = assets.map((asset) => {
      return this.cacheManager.set(
        this.getAssetCacheKey(asset),
        asset,
        this.configService.get('cache.assetsTtl'),
      );
    });
    await Promise.all(promises);
  }

  private getAssetCacheKey(request: GetAssetRequest) {
    const { address, chainId } = request;
    return `${this.cacheKeyPrefix}-${chainId}-${address}`;
  }

  private getAssetsFromDatabase(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    // TODO: Filter out outdated prices in repository
    return this.assetsRepository.findManyByAddressesAndChainIds(requests, ['prices']);
  }

  private async processAssets(requests: GetAssetRequest[]): Promise<void> {
    const assetsJobType = this.configService.get('ASSETS_METADATA_JOB_TYPE');
    requests.map((request) => {
      this.logger.log('Send asset for processing', request);
      return this.assetsQueue.add(assetsJobType, {
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
