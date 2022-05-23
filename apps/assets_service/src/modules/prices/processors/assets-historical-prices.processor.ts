import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../../common/enum/job-states.enum';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetsService } from '../../assets/services/assets.service';
import { AssetHistoricalPriceEntity } from '../entities/asset-historical-price.entity';
import { TimeGranularity } from '../enums/time-granularity.enum';
import { AssetsHistoricalPriceRepository } from '../repositories/asset-historical-price.repository';
import { AssetsPriceRepository } from '../repositories/asset-price.repository';
import { HistoricalPriceJobData } from '../types/historical-price-job-data.type';

@Processor('assets')
export class AssetsHistoricalPricesProcessor {
  constructor(
    private configService: ConfigService,
    private assetsService: AssetsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsRepository) private readonly assetRepository: AssetsRepository,
    @InjectRepository(AssetsPriceRepository)
    private readonly assetsPriceRepository: AssetsPriceRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
  ) {}

  @Process('historicalPrices')
  async handlePriceJob(job: Job) {
    try {
      await this.processingJob(job.data);
      return JobCompleteStates.SUCCESS;
    } catch (error) {
      this.logger.error(`Error to process historical price job.id: ${job.id}`);
      this.logger.error(error);
      return JobCompleteStates.FAILURE;
    }
  }

  private async updateDatabaseAssetPriceCandles(
    assetId: number,
    timeGranularity: number,
  ): Promise<void> {
    const candles = await this.assetsPriceRepository.getAssetPriceCandles(assetId, timeGranularity);
    const candleEntities = candles.map((candle) => {
      const candleEntity = new AssetHistoricalPriceEntity();
      Object.assign(candleEntity, candle, { timestamp: candle.time });
      return candleEntity;
    });
    await this.assetsHistoricalPriceRepository.save(candleEntities);
  }

  private async processingJob(jobData: HistoricalPriceJobData): Promise<void> {
    const { assetId } = jobData;

    // Process M15 prices
    await this.updateDatabaseAssetPriceCandles(assetId, TimeGranularity.M15);

    // Process H1 prices
    await this.updateDatabaseAssetPriceCandles(assetId, TimeGranularity.H1);

    // Process H4 prices
    await this.updateDatabaseAssetPriceCandles(assetId, TimeGranularity.H4);
  }
}
