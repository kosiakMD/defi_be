import { Job } from 'bull';
import { Repository } from 'typeorm';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetCategoryEnum } from '@app/common/enum';

import { JobCompleteStates } from '../../../common/enum/JobStates.enum';
import { MetadataService } from '../../../common/services/metadata/metadata.service';

import { AssetsCategoryEntity } from '../../assets-category/entities/assets-category.entity';
import { AssetsCategoryRepository } from '../../assets-category/repositories/assets-category.repository';
import { IconsService } from '../../icons/icons.service';
import { AssetUnderlyingEntity } from '../entities/assets-underlying.entity';
import { AssetsEntity } from '../entities/assets.entity';
import { AssetsRepository } from '../repositories/assets.repository';
import { AssetsService } from '../services/assets.service';
import { TokenService } from '../services/token.service';

@Processor('assets')
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
    private readonly tokenService: TokenService,
  ) {}

  @Process('metadata')
  public async handleMetadataJob(job: Job) {
    try {
      const { address, chainId } = job.data;
      this.logger.debug(
        `Received job ${job.id}. Start getting metadata address: ${address}, chainId: ${chainId}`,
      );
      const asset: AssetsEntity = await this.processAsset({ address, chainId });
      this.logger.debug(
        `Asset id: ${asset.id} chainId: ${chainId} address: ${address} is prcessed`,
      );
      return JobCompleteStates.SUCCESS;
    } catch (error) {
      this.logger.error(`Error to progress job: ${job.id}`);
      this.logger.error(error);
      return JobCompleteStates.FAILURE;
    }
  }

  private async getAssetCategory(hasUnderlying: boolean): Promise<AssetsCategoryEntity> {
    if (hasUnderlying) {
      return this.assetsCategoryRepository.findOneByName(AssetCategoryEnum.LP_TOKEN);
    }
    return this.assetsCategoryRepository.findOneByName(AssetCategoryEnum.TOKEN);
  }

  private async saveAsset(asset: AssetsEntity): Promise<AssetsEntity> {
    const savedAsset = await this.assetRepository.save(asset);
    await this.assetsService.setAssetsToCache([savedAsset]);
    return savedAsset;
  }

  public async processAsset(assetData: Partial<AssetsEntity>): Promise<AssetsEntity> {
    try {
      this.logger.debug(`Process asset data ${JSON.stringify(assetData)}`);

      const { address, chainId, rank, isTracked } = assetData;
      const existentAsset = await this.assetRepository.findOneByAddressAndChain(address, chainId);

      if (existentAsset) {
        if (rank) {
          this.assetRepository
            .update(existentAsset.id, { rank })
            .catch(({ message }) =>
              this.logger.warn(
                `Asset ${address} chainId ${chainId} rank was not updated! Error: ${message}`,
              ),
            );
        }
        if (isTracked) {
          this.assetRepository
            .update(existentAsset.id, { isTracked })
            .catch(({ message }) =>
              this.logger.warn(
                `Asset ${address} chainId ${chainId} isTracked was not updated! Error: ${message}`,
              ),
            );
        }
        return existentAsset;
      }

      const assetMetadata = await this.metadataService.getMetadata(address, chainId);
      let processingAsset = new AssetsEntity();

      processingAsset.address = address;
      processingAsset.chainId = chainId;
      processingAsset.symbol = assetMetadata.symbol;
      processingAsset.name = assetMetadata.name;
      processingAsset.decimals = assetMetadata.decimals;
      processingAsset.rank = rank < 0 ? -1 : rank;
      processingAsset.isTracked = Boolean(isTracked);

      const underlyingTokens = await this.tokenService.getUnderlyingAssetsIfExists(processingAsset);
      processingAsset.category = await this.getAssetCategory(Boolean(underlyingTokens?.length));
      const icons = await this.iconsService.getIconUrls({
        symbol: processingAsset.symbol,
        chainId: processingAsset.chainId,
        address: processingAsset.address,
      });

      processingAsset.icon = icons[0]?.Location;

      processingAsset = await this.saveAsset(processingAsset);

      if (Array.isArray(underlyingTokens) && underlyingTokens?.length !== 0) {
        underlyingTokens.map(async (underlyingToken: AssetsEntity, index: number) => {
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
      this.logger.error(`Error to process asset data ${JSON.stringify(assetData)}`);
      throw error;
    }
  }
}
