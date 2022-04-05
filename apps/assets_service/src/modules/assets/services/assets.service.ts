import { Queue } from 'bull';
import { Cache } from 'cache-manager';

import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER, Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CrudService } from '@app/common/services/crud.service';

import { AssetsGetDto } from '../dto/assets-get.dto';
import { AssetsListQueryDto } from '../dto/assets-list-query.dto';
import { AssetsEntity } from '../entities/assets.entity';
import { AssetsRepository } from '../repositories/assets.repository';

@Injectable()
export class AssetsService extends CrudService<AssetsRepository> {
  constructor(
    @InjectRepository(AssetsRepository)
    private assetsRepository: AssetsRepository,
    @InjectQueue('assets') private readonly assetsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(AssetsRepository);
  }

  public async getAsset(assetQuery: AssetsGetDto): Promise<AssetsEntity> {
    const assetsBulkQuery = [assetQuery];
    return (await this.getBulkAssets(assetsBulkQuery)).shift();
  }

  public async getBulkAssets(assetsBulkQuery: AssetsGetDto[]): Promise<AssetsEntity[]> {
    // TODO: It's required to use config here, it's never boolean
    if (!process.env.USE_REDIS_TO_GET_ASSETS) {
      return this.getAssetsFromDatabaseAndInitiateProcessing(assetsBulkQuery);
    } else {
      // TODO: I think we should always use cache
      const cachedAssets = await this.getAssetsFromCache(assetsBulkQuery);
      if (cachedAssets.length >= assetsBulkQuery.length) {
        return cachedAssets;
      }
      const notCachedAssets = assetsBulkQuery.filter((assetQueryDto: AssetsGetDto) => {
        return !cachedAssets?.find((assetsEntity: AssetsEntity) => {
          return (
            // TODO: We need to be sure we store addresses in correct case (web3.utils.toChecksumAddress)
            assetsEntity.address === assetQueryDto.address &&
            assetsEntity.chainId === assetQueryDto.chainId
          );
        });
      });
      const databaseAssets = await this.getAssetsFromDatabaseAndInitiateProcessing(
        notCachedAssets
      );
      this.setAssetsToCache(databaseAssets);

      return cachedAssets.concat(databaseAssets);
    }
  }

  private getAssetCacheKey(assetQuery: AssetsGetDto | AssetsEntity): string {
    const { address, chainId } = assetQuery;
    const keyPrefix = `${(process.env.SERVICE_NAME || 'assets-service')
      .replace(' ', '-')
      .toLowerCase()}`;
    return `${keyPrefix}${chainId}${address}`;
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

  // TODO: This methods should accept list of { chainId, address }
  //  filtering should be moved out
  private async processAssets(
    assetsBulkQuery: AssetsGetDto[],
    assetsFromDatabase: AssetsEntity[],
  ): Promise<void> {
    const assetsNotInDatabase = assetsBulkQuery.filter((assetQueryDto: AssetsGetDto) => {
      return !assetsFromDatabase.find((assetEntity: AssetsEntity) => {
        return (
          assetEntity.address === assetQueryDto.address &&
          assetEntity.chainId === assetQueryDto.chainId
        );
      });
    });

    assetsNotInDatabase.map(async (asset) => {
      // TODO: Queue name should be configurable
      return await this.assetsQueue.add('metadata', {
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
