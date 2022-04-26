import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../common/enum/JobStates.enum';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsService } from '../assets/services/assets.service';
import { AssetsPriceEntity } from './entities/assets-price.entity';
import { AssetsPriceRepository } from './repositories/asset-price.repository';
import priceStrategies from './strategies';
import { AssetPrice } from './types/AssetPrice.type';
import { PriceJobData } from './types/PriceJobData.type';

@Processor('assets')
export class AssetsProcessor {
  constructor(
    @InjectRepository(AssetsRepository)
    private readonly assetRepository: AssetsRepository,
    @InjectRepository(AssetsPriceRepository)
    private readonly assetsPriceRepository: AssetsPriceRepository,
    private assetsService: AssetsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  @Process('prices')
  async handlePriceJob(job: Job) {
    try {
      const {
        config: { chainId },
        strategy,
      } = job.data;
      this.logger.debug(
        `Processing price job for assets on chainId: ${chainId}, strategy: ${strategy}`,
      );
      await this.processingJob(job.data);
      return JobCompleteStates.SUCCESS;
    } catch (error) {
      this.logger.error(`Error to process price job.id: ${job.id}`);
      return JobCompleteStates.FAILURE;
    }
  }

  private async updateAssetPrice(assetPrice: AssetPrice): Promise<void> {
    try {
      const {
        // chainId,
        // address,
        priceInUsd,
        sourceId,
      } = assetPrice;
      const assetFromCache = (await this.assetsService.getAssetsFromCache([assetPrice])).shift();
      if (assetFromCache) {
        if (!assetFromCache.prices) {
          assetFromCache.prices = [];
        }
        let assetPrice = assetFromCache.prices.find(
          (assetPrice) => assetPrice.sourceId === sourceId,
        );
        if (assetPrice) {
          assetPrice.price = priceInUsd;
        } else {
          assetPrice = new AssetsPriceEntity();
          assetPrice.price = priceInUsd;
          assetPrice.sourceId = sourceId;
          assetFromCache.prices.push(assetPrice);
        }
        await this.assetsService.setAssetsToCache([assetFromCache]);
      }
      // TO_CHECK if we need it

      // if (process.env.UPDATE_ASSET_PRICES_IN_DB) {
      //   const asset = await this.assetRepository.findOne({
      //     where: { chainId, address },
      //   });
      //   if (asset) {
      //     const { id: assetId } = asset;
      //     await this.assetsPriceRepository.save({
      //       assetId,
      //       priceInUsd,
      //       sourceId,
      //     });
      //   }
      // }
    } catch (error) {
      this.logger.error(`Error to update asset price ${assetPrice}`);
    }
  }

  private async processingJob(jobData: PriceJobData): Promise<void> {
    const { strategy } = jobData;
    const priceStrategy = priceStrategies.get(strategy);
    const assetsPrices = await priceStrategy.fetchPrices(jobData, this.assetRepository);
    const promises = assetsPrices.map(this.updateAssetPrice.bind(this));
    await Promise.all(promises);
  }
}
