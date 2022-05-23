import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobName } from '../../common/enum/job-name.enum';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { PriceService } from './price.service';
import { AssetsCurrentPricesProcessor } from './processors/assets-current-prices.processor';
import { PriceSourceRepository } from './repositories/price-source.repository';

@Injectable()
export class PriceJobEmitter {
  constructor(
    private configService: ConfigService,
    private priceService: PriceService,
    @InjectQueue('assets') private assetsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
    private readonly assetsCurrentPricesProcessor: AssetsCurrentPricesProcessor,
  ) {}

  public emitJob(job: JobName) {
    switch (job) {
      case JobName.CLEAR_PRICES:
        return this.assetsCurrentPricesProcessor.clearDBOnCurrentPrices();
      case JobName.HISTORICAL_PRICES:
        return this.assetsCurrentPricesProcessor.createHistoricalPrices();
      default:
        this.logger.error(`Unknow job ${job}`);
    }
  }
}
