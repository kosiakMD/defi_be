import { Job } from 'bull';
import { Repository } from 'typeorm';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobName } from '../../../common/enum/job-name.enum';
import { JobCompleteStates } from '../../../common/enum/job-states.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { AssetCategoryEntity } from '../../assets-category/entities/asset-category.entity';
import { AssetsCategoryRepository } from '../../assets-category/repositories/assets-category.repository';
import { IconsService } from '../../icons/icons.service';
import { AssetUnderlyingEntity } from '../entities/asset-underlying.entity';
import { AssetEntity } from '../entities/asset.entity';
import { AssetsRepository } from '../repositories/assets.repository';
import { AssetsService } from '../services/assets.service';
import { MetadataService } from '../services/metadata/metadata.service';
import { SpecificAssetsService } from '../services/specific-assets/specific-assets.service';
import { AssetProcessingRequest } from '../types/asset-processing.request';

@Processor(QueueName.ASSETS)
export class AssetsProcessor {
  constructor(
    @InjectRepository(AssetsRepository)
    private readonly assetRepository: AssetsRepository,
    private readonly assetsService: AssetsService,
    @InjectRepository(AssetUnderlyingEntity)
    private readonly assetUnderlyingRepository: Repository<AssetUnderlyingEntity>,
    @InjectRepository(AssetsCategoryRepository)
    private readonly assetsCategoryRepository: AssetsCategoryRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly metadataService: MetadataService,
    private readonly iconsService: IconsService,
    private readonly tokenService: SpecificAssetsService,
  ) {}

  @Process({
    name: JobName.ASSET_METADATA,
    // TODO: Move to config (testing this value)
    concurrency: 2,
  })
  public async handleMetadataJob(job: Job<AssetProcessingRequest>) {
    try {
      const { address, chainId } = job.data;
      this.logger.debug(
        `Received job ${job.id}. Start getting metadata address: ${address}, chainId: ${chainId}`,
      );
      const asset: AssetEntity = await this.processAsset(job.data);
      this.logger.debug(
        `Asset id: ${asset.id} chainId: ${chainId} address: ${address} is processed`,
      );
      await job.moveToCompleted(JobCompleteStates.SUCCESS);
    } catch (e) {
      this.logger.error(`Error to progress job: ${job.id}. Error: ${e}`);
      await job.moveToFailed({ message: e.toString() });
    }
  }

  private async processAsset(assetRequest: AssetProcessingRequest): Promise<AssetEntity> {
    try {
      this.logger.debug(`Process asset data ${JSON.stringify(assetRequest)}`);

      const { address, chainId, rank, isTracked } = assetRequest;
      const savedAsset = await this.assetRepository.findOneByAddressAndChain(address, chainId);
      if (savedAsset) {
        return await this.updateAsset(savedAsset, assetRequest);
      }

      const assetMetadata = await this.metadataService.getMetadata(address, chainId);
      let processingAsset = new AssetEntity();

      processingAsset.address = address;
      processingAsset.chainId = chainId;
      processingAsset.symbol = assetMetadata.symbol;
      processingAsset.name = assetMetadata.name;
      processingAsset.decimals = assetMetadata.decimals;
      processingAsset.rank = rank;
      processingAsset.isTracked = isTracked || false;

      const underlyingTokens = await this.tokenService.getUnderlyingAssetsIfExists(processingAsset);

      // TODO: Temp compilation fix - logic is incorrect
      processingAsset.categories = [await this.getAssetCategory(Boolean(underlyingTokens?.length))];
      processingAsset.icon = await this.loadAssetIcons(processingAsset);

      // TODO: Asset should be saved at the very end
      processingAsset = await this.saveAsset(processingAsset);

      if (Array.isArray(underlyingTokens) && underlyingTokens?.length !== 0) {
        underlyingTokens.map(async (underlyingToken: AssetEntity, index: number) => {
          const newAsset = await this.processAsset({
            address: underlyingToken.address,
            chainId: underlyingToken.chainId,
          });

          const newUnderlyingTokenRelation = this.assetUnderlyingRepository.create({
            asset: processingAsset,
            underlyingAsset: newAsset,
            position: index,
          });

          await this.assetUnderlyingRepository.save(newUnderlyingTokenRelation);
        });
      }

      return processingAsset;
    } catch (error) {
      this.logger.error(`Error to process asset data ${JSON.stringify(assetRequest)}`);
      throw error;
    }
  }

  private async loadAssetIcons(asset: AssetEntity) {
    const icons = await this.iconsService.loadAssetIcons({
      symbol: asset.symbol,
      chainId: asset.chainId,
      address: asset.address,
    });

    // NOTE: Largest loaded icon is selected
    const largestIcon = icons.reduce(
      (largest, current) => (current.fileSize >= largest.fileSize ? current : largest),
      { url: null, fileSize: 0 },
    );
    return largestIcon.url;
  }

  private async updateAsset(asset: AssetEntity, request: AssetProcessingRequest) {
    // TODO: Invalidate / update cache?
    asset.metadata = {
      ...asset.metadata,
      ...request.metadata,
    };

    if (request.rank && asset.rank !== request.rank) {
      asset.rank = request.rank;
    }
    if (request.isTracked && !asset.isTracked) {
      asset.isTracked = request.isTracked;
    }
    if (!asset.icon) {
      // TODO: Enable this one and refresh from time to time
      asset.icon = await this.loadAssetIcons(asset);
    }
    return await this.assetRepository.save(asset);
  }

  private async getAssetCategory(hasUnderlying: boolean): Promise<AssetCategoryEntity> {
    if (hasUnderlying) {
      return this.assetsCategoryRepository.findOneByCode('LP');
    }
    return this.assetsCategoryRepository.findOneByCode('COIN');
  }

  private async saveAsset(asset: AssetEntity): Promise<AssetEntity> {
    const { chainId, address } = asset;
    const existentAsset = await this.assetRepository //
      .findOne({ where: { chainId, address, disabled: false } });
    if (existentAsset) {
      throw Error(`Try to process already existing asset chainId: ${chainId}, address: ${address}`);
    }
    const savedAsset = await this.assetRepository.save(asset);
    await this.assetsService.setAssetsToCache([savedAsset]);
    return savedAsset;
  }
}
