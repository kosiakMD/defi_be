import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address } from '@app/common';
import { formatAddress, formatError, isZeroAddress } from '@app/common/utils';

import { AssetJobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { AssetReference } from '../../../common/types';

import { AssetsCategoryRepository } from '../../assets-category/repositories/assets-category.repository';
import { AssetUnderlyingEntity } from '../entities/asset-underlying.entity';
import { AssetEntity } from '../entities/asset.entity';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';
import { AssetIcon } from '../services/analysers/core/asset.analyser';
import { AssetAnalyserService } from '../services/asset-analyser.service';
import { IconsService } from '../services/icons.service';
import { InvalidAssetService } from '../services/invalid-asset.service';
import { AssetMetadata } from '../types/asset-metadata.type';
import { AssetProcessingRequest } from '../types/asset-processing.request';

/*
 Main Assets processor that analyses and stores assets.
 Executed on demand.
* */
@Processor(QueueName.ASSETS)
export class AssetsProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly assetsRepository: AssetsCachedRepository,
    @InjectRepository(AssetsCategoryRepository)
    private readonly assetsCategoryRepository: AssetsCategoryRepository,
    private readonly invalidAssetService: InvalidAssetService,
    private readonly iconsService: IconsService,
    private readonly assetAnalyserService: AssetAnalyserService,
  ) {}

  @Process({
    name: AssetJobName.ASSET_METADATA,
    concurrency: 2,
  })
  public async handleMetadataJob(job: Job<AssetProcessingRequest>) {
    try {
      const data = {
        ...job.data,
        address: formatAddress(job.data.address),
      };
      const { address, chainId } = data;
      this.logger.debug(
        `Received job ${job.id}. Start getting metadata address: ${address}, chainId: ${chainId}`,
      );
      const asset = await this.processAsset(data);
      this.logger.debug(
        `Asset chainId: ${chainId} address: ${address} is processed, id: ${asset?.id || ''}`,
      );
    } catch (e) {
      this.logger.error(`Error to progress job [${job.id}]: ${e.message}, ${e.stack}`, { job });
      throw e;
    }
  }

  private async processAsset(assetRequest: AssetProcessingRequest): Promise<AssetEntity> {
    const { address, chainId, isTracked } = assetRequest;

    try {
      this.logger.debug(`Process asset data ${JSON.stringify(assetRequest)}`);

      if (
        !assetRequest.forceUpdate &&
        (await this.invalidAssetService.isAssetInvalid(chainId, address))
      ) {
        this.logger.debug(`Skip processing invalid asset ${JSON.stringify(assetRequest)}`);
        return;
      }

      const existingAsset = await this.assetsRepository.findOneByAddressAndChain(address, chainId);
      if (existingAsset) {
        // TODO: Outdated asset is not handled
        if (!assetRequest.forceUpdate) {
          this.logger.debug(
            `Asset id: ${existingAsset.id} chainId: ${chainId} address: ${address} found, updating`,
          );
          // if forceUpdate flag is provided we don't need to update the asset
          // because we are going to re-process it
          await this.updateAsset(existingAsset, assetRequest);
          return existingAsset;
        }
        this.logger.debug(
          `Asset id: ${existingAsset.id} chainId: ${chainId} address: ${address} found, but force reload requested`,
        );
      }

      const processingAsset = existingAsset || new AssetEntity();

      const asset = await this.assetAnalyserService.analyseAsset({ chainId, address });
      if (!asset) {
        this.logger.warn(`Asset chainId: ${chainId} address: ${address} cannot be analysed`);
        await this.invalidAssetService.increaseInvalidRetries(chainId, address);
        return;
      }

      this.logger.log(`Asset analysis result: ${JSON.stringify(asset)}`);

      processingAsset.address = address;
      processingAsset.chainId = chainId;
      processingAsset.symbol = asset.symbol;
      processingAsset.name = asset.name;
      processingAsset.decimals = asset.decimals;
      processingAsset.rank = this.calculateRank(address, asset.metadata);
      processingAsset.isTracked = asset.isTracked || isTracked || false;
      processingAsset.underlying = [];
      processingAsset.metadata = asset.metadata || {};

      processingAsset.icon = await this.loadAssetIcons({ chainId, address }, asset.icons);

      processingAsset.categories = await this.assetsCategoryRepository.findOrCreate(
        asset.categories,
      );

      for (const underlyingAddress of asset.underlying || []) {
        const underlying = new AssetUnderlyingEntity();
        underlying.position = asset.underlying.indexOf(underlyingAddress);
        underlying.underlyingAsset = await this.processAsset({
          address: underlyingAddress,
          chainId,
          forceUpdate: assetRequest.forceUpdate,
        });
        processingAsset.underlying.push(underlying);
      }

      // It's only possible to calculate display name after underlying loaded
      processingAsset.displayName = this.buildDisplayName(processingAsset);

      const savedAsset = await this.assetsRepository.save(processingAsset);

      // Asset was stored so we removed it from invalid list
      await this.invalidAssetService.cleanInvalidAsset(chainId, address);

      return savedAsset;
    } catch (error) {
      // TODO: We should handle invalid addresses here after few retries they should go to invalid addresses table
      this.logger.error('Error to process asset data', {
        request: assetRequest,
        error: formatError(error),
      });

      await this.invalidAssetService.increaseInvalidRetries(chainId, address);

      throw error;
    }
  }

  private async loadAssetIcons(asset: AssetReference, icons: AssetIcon[]) {
    const savedIcons = await this.iconsService.uploadAssetIcons(asset, icons);

    // NOTE: Largest loaded icon is selected
    const largestIcon = savedIcons.reduce(
      (largest, current) => (current.fileSize >= largest.fileSize ? current : largest),
      { url: null, fileSize: 0 },
    );
    return largestIcon.url;
  }

  private calculateRank(address: Address, metadata: AssetMetadata = {}) {
    // TODO: Check if is native coin
    if (isZeroAddress(address)) {
      // Coins should be at the top
      return 1;
    }

    const { marketCapRank, coingeckoRank, coingeckoId, coinmarketcapId } = metadata;
    // NOTE: If market cap present return it
    if (marketCapRank) {
      return marketCapRank;
    }

    // NOTE: If coingeko rank present return it
    if (coingeckoRank) {
      return coingeckoRank;
    }

    // If asset found in CMC or coingecko assign some rank to it
    if (coinmarketcapId || coingeckoId) {
      return 10000;
    }

    // No rank
    return null;
  }

  private buildDisplayName(asset: AssetEntity): string {
    if (asset.underlying?.length) {
      let displayName = asset.underlying
        .map(({ underlyingAsset }) => this.buildDisplayName(underlyingAsset))
        .join('/');

      if (asset.isLpToken) {
        displayName += ' LP';
      }

      return displayName;
    }

    return asset.symbol?.toUpperCase() || asset.name;
  }

  private async updateAsset(asset: AssetEntity, request: AssetProcessingRequest) {
    asset.metadata = {
      ...asset.metadata,
      ...request.metadata,
    };

    asset.rank = this.calculateRank(asset.address, asset.metadata);
    // TODO: Handle case when asset should have price but not be shown in balances
    if (request.isTracked && !asset.isTracked) {
      asset.isTracked = request.isTracked;
    }
    return await this.assetsRepository.save(asset);
  }
}
