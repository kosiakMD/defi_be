import { Job } from 'bull';
import { LessThan } from 'typeorm';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../../common/enum/JobStates.enum';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetsService } from '../../assets/services/assets.service';
import { AssetsPriceEntity } from '../entities/assets-price.entity';
import { AssetsPriceRepository } from '../repositories/asset-price.repository';
import priceStrategies from '../strategies';
import { AssetPrice } from '../types/AssetPrice.type';
import { PriceJobData } from '../types/PriceJobData.type';

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
      return JobCompleteStates.FAILURE;
    }
  }

  private async clearDBOnCurrentPrices(): Promise<void> {
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
      const { chainId, address, price, sourceId } = assetPrice;
      const assetFromCache = (await this.assetsService.getAssetsFromCache([assetPrice])).shift();
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
          assetPrice = new AssetsPriceEntity();
          assetPrice.price = price;
          assetPrice.sourceId = sourceId;
          assetFromCache.prices.push(assetPrice);
        }
        await this.assetsService.setAssetsToCache([assetFromCache]);
      }
      if (this.configService.get('UPDATE_ASSET_PRICES_IN_DB')) {
        const asset = await this.assetRepository.findOne({
          where: { chainId, address },
        });
        // TODO check if we need to filter price sources
        if (asset) {
          const { id: assetId } = asset;
          await this.assetsPriceRepository.save({
            assetId,
            price,
            sourceId,
          });
        }
      }
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
