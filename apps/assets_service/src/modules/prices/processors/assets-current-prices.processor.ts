import { Job } from 'bull';
import { LessThan } from 'typeorm';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../../common/enum/job-states.enum';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetsService } from '../../assets/services/assets.service';
import { AssetPriceEntity } from '../entities/asset-price.entity';
import { AssetsPriceRepository } from '../repositories/asset-price.repository';
import priceStrategies from '../strategies';
import { AssetPrice } from '../types/asset-price.type';
import { PriceJobData } from '../types/price-job-data.type';

@Processor('assets')
export class AssetsCurrentPricesProcessor {
  constructor(
    @InjectRepository(AssetsRepository)
    private readonly assetRepository: AssetsRepository,
    @InjectRepository(AssetsPriceRepository)
    private readonly assetsPriceRepository: AssetsPriceRepository,
    private assetsService: AssetsService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  @Process('prices')
  async handlePriceJob(job: Job) {
    try {
      const {
        config: { chainId },
        strategy,
        clearDBOnCurrentPrices,
      } = job.data;
      if (clearDBOnCurrentPrices) {
        this.clearDBOnCurrentPrices();
        return JobCompleteStates.SUCCESS;
      }
      this.logger.debug(
        `Processing price job for assets on chainId: ${chainId}, strategy: ${strategy}`,
      );
      await this.processingJob(job.data);
      return JobCompleteStates.SUCCESS;
    } catch (error) {
      this.logger.error(`Error to process price job.id: ${job.id}`);
      this.logger.error(error);
      return JobCompleteStates.FAILURE;
    }
  }

  private async clearDBOnCurrentPrices(): Promise<void> {
    // TODO: implement database time granularity cleaning
    try {
      await this.assetsPriceRepository.delete({
        timestamp: LessThan(
          new Date(
            Date.now() -
              this.configService.get<number>('ASSETS_CURRENT_PRICES_DEADLINE_TO_KEEP_IN_DATABASE'),
          ),
        ),
      });
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  private async updateAssetPrice(assetPrice: AssetPrice): Promise<void> {
    try {
      const { price, sourceId } = assetPrice;
      const [assetFromCache] = await this.assetsService.getAssetsFromCache([assetPrice]);
      if (assetFromCache) {
        if (!assetFromCache.prices) {
          assetFromCache.prices = [];
        }
        let assetPrice = assetFromCache.prices.find(
          (assetPrice) => assetPrice.sourceId === sourceId,
        );
        if (assetPrice) {
          assetPrice.price = price;
        } else {
          assetPrice = new AssetPriceEntity();
          assetPrice.price = price;
          assetPrice.sourceId = sourceId;
          assetFromCache.prices.push(assetPrice);
        }
        await this.assetsService.setAssetsToCache([assetFromCache]);
      }
    } catch (error) {
      this.logger.error(
        `Error to update asset price ${JSON.stringify(assetPrice)} ${JSON.stringify(error)}`,
      );
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
