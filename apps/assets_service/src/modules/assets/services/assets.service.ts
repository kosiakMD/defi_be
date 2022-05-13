import { GetAssetResponseDto } from 'apps/assets_service/src/common/dto/GetAssetResponse.dto';
import { HistoricalPricesQuery } from 'apps/assets_service/src/common/dto/HistoricalPricesQuery.dto';
import { GetAssetResponseStatus } from 'apps/assets_service/src/common/enum/GetAssetResponseStatus.enum';
import { TimeRange } from 'apps/assets_service/src/common/enum/TimeRange.enum';
import { Queue } from 'bull';
import { Cache } from 'cache-manager';

import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CrudService } from '@app/common/services/crud.service';
import { isSomeAddress } from '@app/common/utils/addresses';

import { SearchResultType } from '../../../common/enum/SearchResultType.enum';
import { SearchParams, SearchResultsAssetEntry } from '../../../common/interfaces/search.interface';

import { AssetsHistoricalPriceEntity } from '../../prices/entities/assets-historical-price.entity';
import { TimeGranularity } from '../../prices/enums/time-granularity.enum';
import { AssetsHistoricalPriceRepository } from '../../prices/repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from '../../prices/repositories/asset-price.repository';
import { AssetsCandidateDto } from '../dto/assets-candidate.dto';
import { AssetsGetDto } from '../dto/assets-get.dto';
import { AssetsListQueryDto } from '../dto/assets-list-query.dto';
import { AssetsEntity } from '../entities/assets.entity';
import { AssetsCandidateRepository } from '../repositories/assets-candidate.repository';
import { AssetsRepository } from '../repositories/assets.repository';

@Injectable()
export class AssetsService extends CrudService<AssetsRepository> {
  private cacheKeyPrefix: string;
  constructor(
    @InjectRepository(AssetsRepository)
    private assetsRepository: AssetsRepository,
    @InjectRepository(AssetsPriceRepository)
    private assetsPriceRepository: AssetsPriceRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
    @InjectRepository(AssetsCandidateRepository)
    private assetsCandidateRepository: AssetsCandidateRepository,
    private configService: ConfigService,
    @InjectQueue('assets') private readonly assetsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(AssetsRepository);
    this.cacheKeyPrefix = `${this.configService //
      .get('SERVICE_NAME')
      .replace(' ', '-')
      .toLowerCase()}`;
  }

  public async search(searchParams: SearchParams): Promise<SearchResultsAssetEntry[]> {
    const assets = await this.assetsRepository.findAssetsByParams(searchParams);
    return assets.map((a) => ({
      type: SearchResultType.ASSET,
      icon: a.icon,
      name: a.name,
      metadata: {
        address: a.address,
        chainId: a.chainId,
        symbol: a.symbol,
      },
    }));
  }

  public async getAsset(assetCommonQuery: AssetsGetDto): Promise<GetAssetResponseDto> {
    const { historicalPrices, pricesStart, pricesEnd, ...assetQuery } = assetCommonQuery;
    const historicalPricesQuery = { historicalPrices, pricesStart, pricesEnd };
    if (!isSomeAddress(assetQuery.address)) {
      return new GetAssetResponseDto(GetAssetResponseStatus.UNKNOWN_ADDRESS, assetQuery);
    }
    const assetsBulkQuery = [assetQuery];
    const asset = (await this.getBulkAssets(assetsBulkQuery, historicalPricesQuery)).shift();
    if (!asset) {
      return new GetAssetResponseDto(GetAssetResponseStatus.NOT_FOUND, assetCommonQuery);
    }
    return asset;
  }

  public async getBulkAssets(
    assetsBulkQuery: AssetsGetDto[],
    historicalPricesQuery: HistoricalPricesQuery,
  ): Promise<GetAssetResponseDto[]> {
    const assetstoResponse = [];
    const validAssets = assetsBulkQuery.filter(({ address, chainId }) => {
      if (!isSomeAddress(address)) {
        assetstoResponse.push(
          new GetAssetResponseDto(GetAssetResponseStatus.UNKNOWN_ADDRESS, { address, chainId }),
        );
        return false;
      }
      return true;
    });
    // TODO figure out how to operate with historical prices in cache
    if (historicalPricesQuery.historicalPrices) {
      const assets = await this.getAssets(assetsBulkQuery);
      for await (const asset of assets) {
        asset.historicalPrices = await this.getAssetHistoricalPrices(
          asset.id,
          historicalPricesQuery,
        );
        assetstoResponse.push(new GetAssetResponseDto(GetAssetResponseStatus.SUCCESS, asset));
      }
      return assetstoResponse;
    } else {
      const resultAssets = await this.getAssets(validAssets);
      return [
        ...resultAssets.map(
          (resultAsset) => new GetAssetResponseDto(GetAssetResponseStatus.SUCCESS, resultAsset),
        ),
        ...assetstoResponse,
      ];
    }
  }

  private async getAssets(assetsBulkQuery: AssetsGetDto[]): Promise<AssetsEntity[]> {
    if (!this.configService.get('USE_REDIS_TO_GET_ASSETS')) {
      const res = await this.getAssetsFromDatabaseAndInitiateProcessing(assetsBulkQuery);
      return res;
    } else {
      const cachedAssets = await this.getAssetsFromCache(assetsBulkQuery);
      if (cachedAssets.length >= assetsBulkQuery.length) {
        return cachedAssets;
      }
      const notCachedAssets = assetsBulkQuery //
        .filter((assetQueryDto: AssetsGetDto) =>
          this.checkIfAssetNotInArray(assetQueryDto, cachedAssets),
        );
      const databaseAssets = await this.getAssetsFromDatabaseAndInitiateProcessing(notCachedAssets);
      this.setAssetsToCache(databaseAssets);

      return cachedAssets.concat(databaseAssets);
    }
  }

  public saveAssetCandidate(assetCandidateDto: AssetsCandidateDto) {
    const assetsCandidateEntity = this.assetsCandidateRepository.create({
      address: assetCandidateDto.address,
      chainId: assetCandidateDto.chainId,
    });
    return this.assetsCandidateRepository.save(assetsCandidateEntity);
  }

  public async getAssetsFromCache(assetsBulkQuery: AssetsGetDto[]): Promise<AssetsEntity[]> {
    const promises = assetsBulkQuery.map((assetQuery: AssetsGetDto) => {
      return this.cacheManager.get<AssetsEntity>(this.getAssetCacheKey(assetQuery));
    });
    const assets = await Promise.all(promises);
    return assets.filter((asset) => !!asset);
  }

  public async setAssetsToCache(notCachedAssets: AssetsEntity[]): Promise<void> {
    const promises = notCachedAssets.map((assetsEntity: AssetsEntity) => {
      // TO_CHECK if it's a good place to calculate averagePrice
      if (assetsEntity.prices && assetsEntity.prices.length) {
        assetsEntity.averagePrice =
          assetsEntity.prices.reduce((prev, curr) => prev + Number(curr.price), 0) /
          assetsEntity.prices.length;
      }
      return this.cacheManager.set(this.getAssetCacheKey(assetsEntity), assetsEntity);
    });
    await Promise.all(promises);
  }

  private getAssetCacheKey(assetQuery: AssetsGetDto | AssetsEntity): string {
    const { address, chainId } = assetQuery;
    return `${this.cacheKeyPrefix}${chainId}${address}`;
  }

  private checkIfAssetNotInArray(assetQueryDto: AssetsGetDto, assetsFromDatabase: AssetsEntity[]) {
    return !assetsFromDatabase.find((assetEntity: AssetsEntity) => {
      return (
        assetEntity.address === assetQueryDto.address &&
        assetEntity.chainId === assetQueryDto.chainId
      );
    });
  }

  private async processAssets(
    assetsBulkQuery: AssetsGetDto[],
    assetsFromDatabase: AssetsEntity[],
  ): Promise<void> {
    const assetsNotInDatabase = assetsBulkQuery //
      .filter((assetQueryDto) => this.checkIfAssetNotInArray(assetQueryDto, assetsFromDatabase));

    assetsNotInDatabase.map(async (asset) => {
      return await this.assetsQueue.add(this.configService.get('ASSETS_METADATA_JOB_TYPE'), {
        address: asset.address,
        chainId: asset.chainId,
      });
    });
  }

  private async getAssetHistoricalPrices(
    assetId: number,
    historicalPricesQuery: HistoricalPricesQuery,
  ): Promise<AssetsHistoricalPriceEntity[]> {
    if (historicalPricesQuery.historicalPrices) {
      const timeRange = Date.now() - historicalPricesQuery.pricesStart.getTime() - 1000;
      const timeGranularity =
        timeRange <= TimeRange['2_DAYS']
          ? TimeGranularity.M15
          : timeRange <= TimeRange['7_DAYS']
          ? TimeGranularity.H1
          : TimeGranularity.H4;
      return await this.assetsHistoricalPriceRepository //
        .findAssetHistoricalPrices(assetId, historicalPricesQuery, timeGranularity);
    }
    return [];
  }

  private async getAssetsFromDatabaseAndInitiateProcessing(
    assetsBulkQuery: AssetsGetDto[],
  ): Promise<AssetsEntity[]> {
    const assetsListQueryDto = new AssetsListQueryDto();
    const queryOptions = { where: assetsBulkQuery };
    const assetsFromDatabase = await this.assetsRepository.findAllAssetsWithPrices(
      assetsListQueryDto,
      queryOptions,
    );
    for (const asset of assetsFromDatabase) {
      const prices = await this.assetsPriceRepository //
        .findAssetCurrentPrices(asset.id);
      asset.prices = prices;
    }
    this.processAssets(assetsBulkQuery, assetsFromDatabase);
    return assetsFromDatabase;
  }
}
