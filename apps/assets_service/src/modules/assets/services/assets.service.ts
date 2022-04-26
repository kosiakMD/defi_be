import { Queue } from 'bull';
import { Cache } from 'cache-manager';

import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CrudService } from '@app/common/services/crud.service';

import { SearchResultType } from '../../../common/enum/SearchResultType.enum';
import { SearchParams, SearchResultsAssetEntry } from '../../../common/interfaces/search.interface';

import { AssetsCandidateDto } from '../dto/assets-candidate.dto';
import { AssetsGetDto } from '../dto/assets-get.dto';
import { AssetsListQueryDto } from '../dto/assets-list-query.dto';
import { AssetsEntity } from '../entities/assets.entity';
import { AssetsCandidateRepository } from '../repositories/assets-candidate.repository';
import { AssetsRepository } from '../repositories/assets.repository';

@Injectable()
export class AssetsService extends CrudService<AssetsRepository> {
  constructor(
    @InjectRepository(AssetsRepository)
    private assetsRepository: AssetsRepository,
    @InjectRepository(AssetsCandidateRepository)
    private assetsCandidateRepository: AssetsCandidateRepository,
    private configService: ConfigService,
    @InjectQueue('assets') private readonly assetsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(AssetsRepository);
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

  public async getAsset(assetQuery: AssetsGetDto): Promise<AssetsEntity> {
    const assetsBulkQuery = [assetQuery];
    return (await this.getBulkAssets(assetsBulkQuery)).shift();
  }

  public async getBulkAssets(assetsBulkQuery: AssetsGetDto[]): Promise<AssetsEntity[]> {
    if (!this.configService.get('USE_REDIS_TO_GET_ASSETS')) {
      return this.getAssetsFromDatabaseAndInitiateProcessing(assetsBulkQuery);
    } else {
      const cachedAssets = await this.getAssetsFromCache(assetsBulkQuery);
      if (cachedAssets.length >= assetsBulkQuery.length) {
        return cachedAssets;
      }
      const notCachedAssets = assetsBulkQuery.filter((assetQueryDto: AssetsGetDto) => {
        return !cachedAssets?.find((assetsEntity: AssetsEntity) => {
          return (
            assetsEntity.address === assetQueryDto.address &&
            assetsEntity.chainId === assetQueryDto.chainId
          );
        });
      });
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
          assetsEntity.prices.reduce((prev, curr) => prev + curr.price, 0) /
          assetsEntity.prices.length;
      }
      return this.cacheManager.set(this.getAssetCacheKey(assetsEntity), assetsEntity);
    });
    await Promise.all(promises);
  }

  private getAssetCacheKey(assetQuery: AssetsGetDto | AssetsEntity): string {
    const { address, chainId } = assetQuery;
    const keyPrefix = `${this.configService //
      .get('SERVICE_NAME')
      .replace(' ', '-')
      .toLowerCase()}`;
    return `${keyPrefix}${chainId}${address}`;
  }

  private checkIfAssetNotInDatabase(
    assetQueryDto: AssetsGetDto,
    assetsFromDatabase: AssetsEntity[],
  ) {
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
      .filter((assetQueryDto) => this.checkIfAssetNotInDatabase(assetQueryDto, assetsFromDatabase));

    assetsNotInDatabase.map(async (asset) => {
      return await this.assetsQueue.add(this.configService.get('ASSETS_METADATA_JOB_TYPE'), {
        address: asset.address,
        chainId: asset.chainId,
      });
    });
  }

  private async getAssetsFromDatabaseAndInitiateProcessing(
    assetsBulkQuery: AssetsGetDto[],
  ): Promise<AssetsEntity[]> {
    const assetsListQueryDto = new AssetsListQueryDto();
    const assetsFromDatabase = await this.assetsRepository.findAllAssetsWithPrices(
      assetsListQueryDto,
      { where: assetsBulkQuery },
    );
    this.processAssets(assetsBulkQuery, assetsFromDatabase);
    return assetsFromDatabase;
  }
}
