import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { formatAddress, formatError } from '@app/common/utils';

import { JobName } from '../../../common/enum/job-name.enum';
import { JobCompleteStates } from '../../../common/enum/job-states.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { AssetReference } from '../../../common/types';

import { AssetsCategoryRepository } from '../../assets-category/repositories/assets-category.repository';
import { AssetUnderlyingEntity } from '../entities/asset-underlying.entity';
import { AssetEntity } from '../entities/asset.entity';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';
import { AssetIcon } from '../services/analysers/core/asset.analyser';
import { AssetAnalyserService } from '../services/asset-analyser.service';
import { IconsService } from '../services/icons.service';
import { AssetProcessingRequest } from '../types/asset-processing.request';

@Processor(QueueName.ASSETS)
export class AssetsProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly assetsRepository: AssetsCachedRepository,
    @InjectRepository(AssetsCategoryRepository)
    private readonly assetsCategoryRepository: AssetsCategoryRepository,
    private readonly iconsService: IconsService,
    private readonly assetAnalyserService: AssetAnalyserService,
  ) {}

  @Process({
    name: JobName.ASSET_METADATA,
    // TODO: Move to config (testing this value)
    concurrency: 2,
  })
  public async handleMetadataJob(job: Job<AssetProcessingRequest>) {
    try {
      // TODO: Make this one nicer
      job.data.address = formatAddress(job.data.address);
      const { address, chainId } = job.data;
      this.logger.debug(
        `Received job ${job.id}. Start getting metadata address: ${address}, chainId: ${chainId}`,
      );
      const asset = await this.processAsset(job.data);
      this.logger.debug(
        `Asset chainId: ${chainId} address: ${address} is processed, id: ${asset?.id || ''}`,
      );
      await job.moveToCompleted(JobCompleteStates.SUCCESS);
    } catch (e) {
      this.logger.error(`Error to progress job: ${job.id}`, e);
      await job.moveToFailed({ message: e.toString() });
    }
  }

  private async processAsset(assetRequest: AssetProcessingRequest): Promise<AssetEntity> {
    try {
      this.logger.debug(`Process asset data ${JSON.stringify(assetRequest)}`);

      const { address, chainId, rank, isTracked } = assetRequest;
      const savedAsset = await this.assetsRepository.findOneByAddressAndChain(address, chainId);
      if (savedAsset) {
        this.logger.debug(
          `Asset id: ${savedAsset.id} chainId: ${chainId} address: ${address} found, updating`,
        );
        return await this.updateAsset(savedAsset, assetRequest);
      }

      const asset = await this.assetAnalyserService.analyseAsset({ chainId, address });
      if (!asset) {
        this.logger.warn(`Asset chainId: ${chainId} address: ${address} cannot be analysed`);
        return;
      }

      this.logger.log(`Asset analysis result: ${JSON.stringify(asset)}`);

      const processingAsset = new AssetEntity();

      processingAsset.address = address;
      processingAsset.chainId = chainId;
      processingAsset.symbol = asset.symbol;
      processingAsset.name = asset.name;
      processingAsset.decimals = asset.decimals;
      processingAsset.rank = asset.rank || rank;
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
        });
        processingAsset.underlying.push(underlying);
      }

      return await this.assetsRepository.save(processingAsset);
    } catch (error) {
      this.logger.error('Error to process asset data', {
        request: assetRequest,
        error: formatError(error),
      });
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

  private async updateAsset(asset: AssetEntity, request: AssetProcessingRequest) {
    asset.metadata = {
      ...asset.metadata,
      ...request.metadata,
    };

    if (request.rank && asset.rank !== request.rank) {
      asset.rank = request.rank;
    }
    // TODO: Handle case when asset should have price but not be shown in balances
    if (request.isTracked && !asset.isTracked) {
      asset.isTracked = request.isTracked;
    }
    return await this.assetsRepository.save(asset);
  }
}
